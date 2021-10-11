import { setTimeout as sleep } from 'timers/promises';
import { AsyncQueue } from '@sapphire/async-queue';
import AbortController from 'abort-controller';
import fetch, { RequestInit, Response } from 'node-fetch';
import { DiscordAPIError, DiscordErrorData } from '../errors/DiscordAPIError';
import { HTTPError } from '../errors/HTTPError';
import type { InternalRequest, RequestManager, RouteData } from '../RequestManager';
import { RESTEvents } from '../utils/constants';
import { parseResponse } from '../utils/utils';

/**
 * The structure used to handle requests for a given bucket
 */
export class SequentialHandler {
	/**
	 * The unique id of the handler
	 */
	public readonly id: string;

	/**
	 * The time this rate limit bucket will reset
	 */
	private reset = -1;

	/**
	 * The remaining requests that can be made before we are rate limited
	 */
	private remaining = 1;

	/**
	 * The total number of requests that can be made before we are rate limited
	 */
	private limit = Infinity;

	/**
	 * The interface used to sequence async requests sequentially
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
	#asyncQueue = new AsyncQueue();

	/**
	 * @param manager The request manager
	 * @param hash The hash that this RequestHandler handles
	 * @param majorParameter The major parameter for this handler
	 */
	public constructor(
		private readonly manager: RequestManager,
		private readonly hash: string,
		private readonly majorParameter: string,
	) {
		this.id = `${hash}:${majorParameter}`;
	}

	/**
	 * If the bucket is currently inactive (no pending requests)
	 */
	public get inactive(): boolean {
		return this.#asyncQueue.remaining === 0 && !this.limited;
	}

	/**
	 * If the rate limit bucket is currently limited
	 */
	private get limited(): boolean {
		return this.remaining <= 0 && Date.now() < this.reset;
	}

	/**
	 * The time until queued requests can continue
	 */
	private get timeToReset(): number {
		return this.reset - Date.now();
	}

	/**
	 * Emits a debug message
	 * @param message The message to debug
	 */
	private debug(message: string) {
		this.manager.emit(RESTEvents.Debug, `[REST ${this.id}] ${message}`);
	}

	/**
	 * Queues a request to be sent
	 * @param routeId The generalized api route with literal ids for major parameters
	 * @param url The url to do the request on
	 * @param options All the information needed to make a request
	 * @param bodyData The data taht was used to form the body, passed to any errors generated
	 */
	public async queueRequest(
		routeId: RouteData,
		url: string,
		options: RequestInit,
		bodyData: Pick<InternalRequest, 'attachments' | 'body'>,
	): Promise<unknown> {
		// Wait for any previous requests to be completed before this one is run
		await this.#asyncQueue.wait();
		try {
			// Wait for any global rate limits to pass before continuing to process requests
			await this.manager.globalTimeout;
			// Check if this request handler is currently rate limited
			if (this.limited) {
				// Let library users know they have hit a rate limit
				this.manager.emit(RESTEvents.RateLimited, {
					timeToReset: this.timeToReset,
					limit: this.limit,
					method: options.method,
					hash: this.hash,
					route: routeId.bucketRoute,
					majorParameter: this.majorParameter,
				});
				this.debug(`Waiting ${this.timeToReset}ms for rate limit to pass`);
				// Wait the remaining time left before the rate limit resets
				await sleep(this.timeToReset);
			}
			// Make the request, and return the results
			return await this.runRequest(routeId, url, options, bodyData);
		} finally {
			// Allow the next request to fire
			this.#asyncQueue.shift();
		}
	}

	/**
	 * The method that actually makes the request to the api, and updates info about the bucket accordingly
	 * @param routeId The generalized api route with literal ids for major parameters
	 * @param url The fully resolved url to make the request to
	 * @param options The node-fetch options needed to make the request
	 * @param bodyData The data that was used to form the body, passed to any errors generated
	 * @param retries The number of retries this request has already attempted (recursion)
	 */
	private async runRequest(
		routeId: RouteData,
		url: string,
		options: RequestInit,
		bodyData: Pick<InternalRequest, 'attachments' | 'body'>,
		retries = 0,
	): Promise<unknown> {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), this.manager.options.timeout);
		let res: Response;

		try {
			res = await fetch(url, { ...options, signal: controller.signal });
		} catch (error: unknown) {
			// Retry the specified number of times for possible timed out requests
			if (error instanceof Error && error.name === 'AbortError' && retries !== this.manager.options.retries) {
				return this.runRequest(routeId, url, options, bodyData, ++retries);
			}

			throw error;
		} finally {
			clearTimeout(timeout);
		}

		let retryAfter = 0;

		const method = options.method ?? 'get';
		const limit = res.headers.get('X-RateLimit-Limit');
		const remaining = res.headers.get('X-RateLimit-Remaining');
		const reset = res.headers.get('X-RateLimit-Reset-After');
		const hash = res.headers.get('X-RateLimit-Bucket');
		const retry = res.headers.get('Retry-After');

		// Update the total number of requests that can be made before the rate limit resets
		this.limit = limit ? Number(limit) : Infinity;
		// Update the number of remaining requests that can be made before the rate limit resets
		this.remaining = remaining ? Number(remaining) : 1;
		// Update the time when this rate limit resets (reset-after is in seconds)
		this.reset = reset ? Number(reset) * 1000 + Date.now() + this.manager.options.offset : Date.now();

		// Amount of time in milliseconds until we should retry if rate limited (globally or otherwise)
		if (retry) retryAfter = Number(retry) * 1000 + this.manager.options.offset;

		// Handle buckets via the hash header retroactively
		if (hash && hash !== this.hash) {
			// Let library users know when rate limit buckets have been updated
			this.debug(['Received bucket hash update', `  Old Hash  : ${this.hash}`, `  New Hash  : ${hash}`].join('\n'));
			// This queue will eventually be eliminated via attrition
			this.manager.hashes.set(`${method}:${routeId.bucketRoute}`, hash);
		}

		// Handle global rate limit
		if (res.headers.get('X-RateLimit-Global')) {
			this.debug(`We are globally rate limited, blocking all requests for ${retryAfter}ms`);
			// Set the manager's global timeout as the promise for other requests to "wait"
			this.manager.globalTimeout = sleep(retryAfter).then(() => {
				// After the timer is up, clear the promise
				this.manager.globalTimeout = null;
			});
		}

		if (res.ok) {
			return parseResponse(res);
		} else if (res.status === 429) {
			// A rate limit was hit - this may happen if the route isn't associated with an official bucket hash yet, or when first globally rate limited
			this.debug(
				[
					'Encountered unexpected 429 rate limit',
					`  Bucket         : ${routeId.bucketRoute}`,
					`  Major parameter: ${routeId.majorParameter}`,
					`  Hash           : ${this.hash}`,
					`  Retry After    : ${retryAfter}ms`,
				].join('\n'),
			);
			// Wait the retryAfter amount of time before retrying the request
			await sleep(retryAfter);
			// Since this is not a server side issue, the next request should pass, so we don't bump the retries counter
			return this.runRequest(routeId, url, options, bodyData, retries);
		} else if (res.status >= 500 && res.status < 600) {
			// Retry the specified number of times for possible server side issues
			if (retries !== this.manager.options.retries) {
				return this.runRequest(routeId, url, options, bodyData, ++retries);
			}
			// We are out of retries, throw an error
			throw new HTTPError(res.statusText, res.constructor.name, res.status, method, url, bodyData);
		} else {
			// Handle possible malformed requests
			if (res.status >= 400 && res.status < 500) {
				// If we receive this status code, it means the token we had is no longer valid.
				if (res.status === 401) {
					this.manager.setToken(null!);
				}
				// The request will not succeed for some reason, parse the error returned from the api
				const data = (await parseResponse(res)) as DiscordErrorData;
				// throw the API error
				throw new DiscordAPIError(data, data.code, res.status, method, url, bodyData);
			}
			return null;
		}
	}
}
