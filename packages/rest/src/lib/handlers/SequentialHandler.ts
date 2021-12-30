import { setTimeout as sleep } from 'node:timers/promises';
import { AsyncQueue } from '@sapphire/async-queue';
import fetch, { RequestInit, Response } from 'node-fetch';
import { DiscordAPIError, DiscordErrorData, OAuthErrorData } from '../errors/DiscordAPIError';
import { HTTPError } from '../errors/HTTPError';
import { RateLimitError } from '../errors/RateLimitError';
import type { InternalRequest, RequestManager, RouteData } from '../RequestManager';
import { RESTEvents } from '../utils/constants';
import { hasSublimit, parseResponse } from '../utils/utils';
import type { RateLimitData } from '../REST';

/* Invalid request limiting is done on a per-IP basis, not a per-token basis.
 * The best we can do is track invalid counts process-wide (on the theory that
 * users could have multiple bots run from one process) rather than per-bot.
 * Therefore, store these at file scope here rather than in the client's
 * RESTManager object.
 */
let invalidCount = 0;
let invalidCountResetTime: number | null = null;

const enum QueueType {
	Standard,
	Sublimit,
}

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
	 * The interface used to sequence sublimited async requests sequentially
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
	#sublimitedQueue: AsyncQueue | null = null;

	/**
	 * A promise wrapper for when the sublimited queue is finished being processed or null when not being processed
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
	#sublimitPromise: { promise: Promise<void>; resolve: () => void } | null = null;

	/**
	 * Whether the sublimit queue needs to be shifted in the finally block
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
	#shiftSublimit = false;

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
		return (
			this.#asyncQueue.remaining === 0 &&
			(this.#sublimitedQueue === null || this.#sublimitedQueue.remaining === 0) &&
			!this.limited
		);
	}

	/**
	 * If the rate limit bucket is currently limited by the global limit
	 */
	private get globalLimited(): boolean {
		return this.manager.globalRemaining <= 0 && Date.now() < this.manager.globalReset;
	}

	/**
	 * If the rate limit bucket is currently limited by its limit
	 */
	private get localLimited(): boolean {
		return this.remaining <= 0 && Date.now() < this.reset;
	}

	/**
	 * If the rate limit bucket is currently limited
	 */
	private get limited(): boolean {
		return this.globalLimited || this.localLimited;
	}

	/**
	 * The time until queued requests can continue
	 */
	private get timeToReset(): number {
		return this.reset + this.manager.options.offset - Date.now();
	}

	/**
	 * Emits a debug message
	 * @param message The message to debug
	 */
	private debug(message: string) {
		this.manager.emit(RESTEvents.Debug, `[REST ${this.id}] ${message}`);
	}

	/**
	 * Delay all requests for the specified amount of time, handling global rate limits
	 * @param time The amount of time to delay all requests for
	 * @returns
	 */
	private async globalDelayFor(time: number): Promise<void> {
		await sleep(time, undefined, { ref: false });
		this.manager.globalDelay = null;
	}

	/*
	 * Determines whether the request should be queued or whether a RateLimitError should be thrown
	 */
	private async onRateLimit(rateLimitData: RateLimitData) {
		const { options } = this.manager;
		if (!options.rejectOnRateLimit) return;

		const shouldThrow =
			typeof options.rejectOnRateLimit === 'function'
				? await options.rejectOnRateLimit(rateLimitData)
				: options.rejectOnRateLimit.some((route) => rateLimitData.route.startsWith(route.toLowerCase()));
		if (shouldThrow) {
			throw new RateLimitError(rateLimitData);
		}
	}

	/**
	 * Queues a request to be sent
	 * @param routeId The generalized api route with literal ids for major parameters
	 * @param url The url to do the request on
	 * @param options All the information needed to make a request
	 * @param bodyData The data that was used to form the body, passed to any errors generated and for determining whether to sublimit
	 */
	public async queueRequest(
		routeId: RouteData,
		url: string,
		options: RequestInit,
		bodyData: Pick<InternalRequest, 'files' | 'body'>,
	): Promise<unknown> {
		let queue = this.#asyncQueue;
		let queueType = QueueType.Standard;
		// Separate sublimited requests when already sublimited
		if (this.#sublimitedQueue && hasSublimit(routeId.bucketRoute, bodyData.body, options.method)) {
			queue = this.#sublimitedQueue!;
			queueType = QueueType.Sublimit;
		}
		// Wait for any previous requests to be completed before this one is run
		await queue.wait();
		// This set handles retroactively sublimiting requests
		if (queueType === QueueType.Standard) {
			if (this.#sublimitedQueue && hasSublimit(routeId.bucketRoute, bodyData.body, options.method)) {
				/**
				 * Remove the request from the standard queue, it should never be possible to get here while processing the
				 * sublimit queue so there is no need to worry about shifting the wrong request
				 */
				queue = this.#sublimitedQueue!;
				const wait = queue.wait();
				this.#asyncQueue.shift();
				await wait;
			} else if (this.#sublimitPromise) {
				// Stall requests while the sublimit queue gets processed
				await this.#sublimitPromise.promise;
			}
		}
		try {
			// Make the request, and return the results
			return await this.runRequest(routeId, url, options, bodyData);
		} finally {
			// Allow the next request to fire
			queue.shift();
			if (this.#shiftSublimit) {
				this.#shiftSublimit = false;
				this.#sublimitedQueue?.shift();
			}
			// If this request is the last request in a sublimit
			if (this.#sublimitedQueue?.remaining === 0) {
				this.#sublimitPromise?.resolve();
				this.#sublimitedQueue = null;
			}
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
		bodyData: Pick<InternalRequest, 'files' | 'body'>,
		retries = 0,
	): Promise<unknown> {
		/*
		 * After calculations have been done, pre-emptively stop further requests
		 * Potentially loop until this task can run if e.g. the global rate limit is hit twice
		 */
		while (this.limited) {
			const isGlobal = this.globalLimited;
			let limit: number;
			let timeout: number;
			let delay: Promise<void>;

			if (isGlobal) {
				// Set RateLimitData based on the globl limit
				limit = this.manager.options.globalRequestsPerSecond;
				timeout = this.manager.globalReset + this.manager.options.offset - Date.now();
				// If this is the first task to reach the global timeout, set the global delay
				if (!this.manager.globalDelay) {
					// The global delay function clears the global delay state when it is resolved
					this.manager.globalDelay = this.globalDelayFor(timeout);
				}
				delay = this.manager.globalDelay;
			} else {
				// Set RateLimitData based on the route-specific limit
				limit = this.limit;
				timeout = this.timeToReset;
				delay = sleep(timeout, undefined, { ref: false });
			}
			const rateLimitData: RateLimitData = {
				timeToReset: timeout,
				limit,
				method: options.method ?? 'get',
				hash: this.hash,
				url,
				route: routeId.bucketRoute,
				majorParameter: this.majorParameter,
				global: isGlobal,
			};
			// Let library users know they have hit a rate limit
			this.manager.emit(RESTEvents.RateLimited, rateLimitData);
			// Determine whether a RateLimitError should be thrown
			await this.onRateLimit(rateLimitData);
			// When not erroring, emit debug for what is happening
			if (isGlobal) {
				this.debug(`Global rate limit hit, blocking all requests for ${timeout}ms`);
			} else {
				this.debug(`Waiting ${timeout}ms for rate limit to pass`);
			}
			// Wait the remaining time left before the rate limit resets
			await delay;
		}
		// As the request goes out, update the global usage information
		if (!this.manager.globalReset || this.manager.globalReset < Date.now()) {
			this.manager.globalReset = Date.now() + 1000;
			this.manager.globalRemaining = this.manager.options.globalRequestsPerSecond;
		}
		this.manager.globalRemaining--;

		const method = options.method ?? 'get';

		if (this.manager.listenerCount(RESTEvents.Request)) {
			this.manager.emit(RESTEvents.Request, {
				method,
				path: routeId.original,
				route: routeId.bucketRoute,
				options,
				data: bodyData,
				retries,
			});
		}

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), this.manager.options.timeout).unref();
		let res: Response;

		try {
			// node-fetch typings are a bit weird, so we have to cast to any to get the correct signature
			// Type 'AbortSignal' is not assignable to type 'import("discord.js-modules/node_modules/@types/node-fetch/externals").AbortSignal'
			res = await fetch(url, { ...options, signal: controller.signal as any });
		} catch (error: unknown) {
			// Retry the specified number of times for possible timed out requests
			if (error instanceof Error && error.name === 'AbortError' && retries !== this.manager.options.retries) {
				return this.runRequest(routeId, url, options, bodyData, ++retries);
			}

			throw error;
		} finally {
			clearTimeout(timeout);
		}

		if (this.manager.listenerCount(RESTEvents.Response)) {
			this.manager.emit(
				RESTEvents.Response,
				{
					method,
					path: routeId.original,
					route: routeId.bucketRoute,
					options,
					data: bodyData,
					retries,
				},
				res.clone(),
			);
		}

		let retryAfter = 0;

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

		// Handle retryAfter, which means we have actually hit a rate limit
		let sublimitTimeout: number | null = null;
		if (retryAfter > 0) {
			if (res.headers.get('X-RateLimit-Global')) {
				this.manager.globalRemaining = 0;
				this.manager.globalReset = Date.now() + retryAfter;
			} else if (!this.localLimited) {
				/*
				 * This is a sublimit (e.g. 2 channel name changes/10 minutes) since the headers don't indicate a
				 * route-wide rate limit. Don't update remaining or reset to avoid rate limiting the whole
				 * endpoint, just set a reset time on the request itself to avoid retrying too soon.
				 */
				sublimitTimeout = retryAfter;
			}
		}

		// Count the invalid requests
		if (res.status === 401 || res.status === 403 || res.status === 429) {
			if (!invalidCountResetTime || invalidCountResetTime < Date.now()) {
				invalidCountResetTime = Date.now() + 1000 * 60 * 10;
				invalidCount = 0;
			}
			invalidCount++;

			const emitInvalid =
				this.manager.options.invalidRequestWarningInterval > 0 &&
				invalidCount % this.manager.options.invalidRequestWarningInterval === 0;
			if (emitInvalid) {
				// Let library users know periodically about invalid requests
				this.manager.emit(RESTEvents.InvalidRequestWarning, {
					count: invalidCount,
					remainingTime: invalidCountResetTime - Date.now(),
				});
			}
		}

		if (res.ok) {
			return parseResponse(res);
		} else if (res.status === 429) {
			// A rate limit was hit - this may happen if the route isn't associated with an official bucket hash yet, or when first globally rate limited
			const isGlobal = this.globalLimited;
			let limit: number;
			let timeout: number;

			if (isGlobal) {
				// Set RateLimitData based on the global limit
				limit = this.manager.options.globalRequestsPerSecond;
				timeout = this.manager.globalReset + this.manager.options.offset - Date.now();
			} else {
				// Set RateLimitData based on the route-specific limit
				limit = this.limit;
				timeout = this.timeToReset;
			}
			await this.onRateLimit({
				timeToReset: timeout,
				limit,
				method,
				hash: this.hash,
				url,
				route: routeId.bucketRoute,
				majorParameter: this.majorParameter,
				global: isGlobal,
			});
			this.debug(
				[
					'Encountered unexpected 429 rate limit',
					`  Global         : ${isGlobal.toString()}`,
					`  Method         : ${method}`,
					`  URL            : ${url}`,
					`  Bucket         : ${routeId.bucketRoute}`,
					`  Major parameter: ${routeId.majorParameter}`,
					`  Hash           : ${this.hash}`,
					`  Limit          : ${limit}`,
					`  Retry After    : ${retryAfter}ms`,
					`  Sublimit       : ${sublimitTimeout ? `${sublimitTimeout}ms` : 'None'}`,
				].join('\n'),
			);
			// If caused by a sublimit, wait it out here so other requests on the route can be handled
			if (sublimitTimeout) {
				// Normally the sublimit queue will not exist, however, if a sublimit is hit while in the sublimit queue, it will
				const firstSublimit = !this.#sublimitedQueue;
				if (firstSublimit) {
					this.#sublimitedQueue = new AsyncQueue();
					void this.#sublimitedQueue.wait();
					this.#asyncQueue.shift();
				}
				this.#sublimitPromise?.resolve();
				this.#sublimitPromise = null;
				await sleep(sublimitTimeout, undefined, { ref: false });
				let resolve: () => void;
				const promise = new Promise<void>((res) => (resolve = res));
				this.#sublimitPromise = { promise, resolve: resolve! };
				if (firstSublimit) {
					// Re-queue this request so it can be shifted by the finally
					await this.#asyncQueue.wait();
					this.#shiftSublimit = true;
				}
			}
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
				const data = (await parseResponse(res)) as DiscordErrorData | OAuthErrorData;
				// throw the API error
				throw new DiscordAPIError(data, 'code' in data ? data.code : data.error, res.status, method, url, bodyData);
			}
			return null;
		}
	}
}
