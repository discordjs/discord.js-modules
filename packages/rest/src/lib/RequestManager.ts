import Collection from '@discordjs/collection';
import FormData from 'form-data';
import { DiscordSnowflake } from '@sapphire/snowflake';
import { EventEmitter } from 'events';
import { Agent } from 'https';
import type { RequestInit } from 'node-fetch';
import type { IHandler } from './handlers/IHandler';
import { SequentialHandler } from './handlers/SequentialHandler';
import type { RESTOptions } from './REST';
import { DefaultRestOptions, DefaultUserAgent } from './utils/constants';

const agent = new Agent({ keepAlive: true });

/**
 * Represents an attachment to be added to the request
 */
export interface RawAttachment {
	fileName: string;
	rawBuffer: Buffer;
}

/**
 * Represents possible data to be given to an endpoint
 */
export interface RequestData {
	/**
	 * Files to be attached to this request
	 */
	attachments?: RawAttachment[];
	/**
	 * If this request needs the `Authorization` header
	 * @default true
	 */
	auth?: boolean;
	/**
	 * The authorization prefix to use for this request, useful if you use this with bearer tokens
	 * @default 'Bot'
	 */
	authPrefix?: 'Bot' | 'Bearer';
	/**
	 * The body to send to this request
	 */
	body?: unknown;
	/**
	 * Additional headers to add to this request
	 */
	headers?: Record<string, string>;
	/**
	 * Query string parameters to append to the called endpoint
	 */
	query?: URLSearchParams;
	/**
	 * Reason to show in the audit logs
	 */
	reason?: string;
	/**
	 * If this request should be versioned
	 * @default true
	 */
	versioned?: boolean;
}

/**
 * Possible headers for an API call
 */
export interface RequestHeaders {
	Authorization?: string;
	'User-Agent': string;
	'X-Audit-Log-Reason'?: string;
}

/**
 * Possible API methods to be used when doing requests
 */
export const enum RequestMethod {
	Delete = 'delete',
	Get = 'get',
	Patch = 'patch',
	Post = 'post',
	Put = 'put',
}

export type RouteLike = `/${string}`;

/**
 * Internal request options
 *
 * @internal
 */
export interface InternalRequest extends RequestData {
	method: RequestMethod;
	fullRoute: RouteLike;
}

/**
 * Parsed route data for an endpoint
 *
 * @internal
 */
export interface RouteData {
	majorParameter: string;
	bucketRoute: string;
	original: string;
}

/**
 * Represents the class that manages handlers for endpoints
 */
export class RequestManager extends EventEmitter {
	/**
	 * A timeout promise that is set when we hit the global rate limit
	 * @default null
	 */
	public globalTimeout: Promise<void> | null = null;

	/**
	 * API bucket hashes that are cached from provided routes
	 */
	public readonly hashes = new Collection<string, string>();

	/**
	 * Request handlers created from the bucket hash and the major parameters
	 */
	public readonly handlers = new Collection<string, IHandler>();

	// eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
	#token: string | null = null;

	public readonly options: RESTOptions;

	public constructor(options: Partial<RESTOptions>) {
		super();
		this.options = { ...DefaultRestOptions, ...options };
		this.options.offset = Math.max(0, this.options.offset);
	}

	/**
	 * Sets the authorization token that should be used for requests
	 * @param token The authorization token to use
	 */
	public setToken(token: string) {
		this.#token = token;
		return this;
	}

	/**
	 * Queues a request to be sent
	 * @param request All the information needed to make a request
	 * @returns The response from the api request
	 */
	public async queueRequest(request: InternalRequest): Promise<unknown> {
		// Generalize the endpoint to its route data
		const routeID = RequestManager.generateRouteData(request.fullRoute, request.method);
		// Get the bucket hash for the generic route, or point to a global route otherwise
		const hash =
			this.hashes.get(`${request.method}:${routeID.bucketRoute}`) ?? `Global(${request.method}:${routeID.bucketRoute})`;

		// Get the request handler for the obtained hash, with its major parameter
		const handler =
			this.handlers.get(`${hash}:${routeID.majorParameter}`) ?? this.createHandler(hash, routeID.majorParameter);

		// Resolve the request into usable fetch/node-fetch options
		const { url, fetchOptions } = this.resolveRequest(request);

		// Queue the request
		return handler.queueRequest(routeID, url, fetchOptions);
	}

	/**
	 * Creates a new rate limit handler from a hash, based on the hash and the major parameter
	 * @param hash The hash for the route
	 * @param majorParameter The major parameter for this handler
	 * @private
	 */
	private createHandler(hash: string, majorParameter: string) {
		// Create the async request queue to handle requests
		const queue = new SequentialHandler(this, hash, majorParameter);
		// Save the queue based on its ID
		this.handlers.set(queue.id, queue);

		return queue;
	}

	/**
	 * Formats the request data to a usable format for fetch
	 * @param request The request data
	 */
	private resolveRequest(request: InternalRequest): { url: string; fetchOptions: RequestInit } {
		const { options } = this;

		let query = '';

		// If a query option is passed, use it
		if (request.query) {
			query = `?${request.query.toString() as string}`;
		}

		// Create the required headers
		const headers: RequestHeaders = {
			'User-Agent': `${DefaultUserAgent} ${options.userAgentAppendix}`.trim(),
		};

		// If this request requires authorization (allowing non-"authorized" requests for webhooks)
		if (request.auth !== false) {
			// If we haven't received a token, throw an error
			if (!this.#token) {
				throw new Error('Expected token to be set for this request, but none was present');
			}

			headers.Authorization = `${request.authPrefix ?? 'Bot'} ${this.#token}`;
		}

		// If a reason was set, set it's appropriate header
		if (request.reason?.length) {
			headers['X-Audit-Log-Reason'] = encodeURIComponent(request.reason);
		}

		// Format the full request URL (api base, optional version, endpoint, optional querystring)
		const url = `${options.api}${request.versioned === false ? '' : `/v${options.version}`}${
			request.fullRoute
		}${query}`;

		let finalBody: RequestInit['body'];
		let additionalHeaders: Record<string, string> = {};

		if (request.attachments?.length) {
			const formData = new FormData();

			// Attach all files to the request
			for (const attachment of request.attachments) {
				formData.append(attachment.fileName, attachment.rawBuffer, attachment.fileName);
			}

			// If a JSON body was added as well, attach it to the form data
			// eslint-disable-next-line no-eq-null
			if (request.body != null) {
				formData.append('payload_json', JSON.stringify(request.body));
			}

			// Set the final body to the form data
			finalBody = formData;
			// Set the additional headers to the form data ones
			additionalHeaders = formData.getHeaders();

			// eslint-disable-next-line no-eq-null
		} else if (request.body != null) {
			// Stringify the JSON data
			finalBody = JSON.stringify(request.body);
			// Set the additional headers to specify the content-type
			additionalHeaders = { 'Content-Type': 'application/json' };
		}

		const fetchOptions = {
			agent,
			body: finalBody,
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
			headers: { ...(request.headers ?? {}), ...additionalHeaders, ...headers } as Record<string, string>,
			method: request.method,
		};

		return { url, fetchOptions };
	}

	/**
	 * Generates route data for an endpoint:method
	 * @param endpoint The raw endpoint to generalize
	 * @param method The HTTP method this endpoint is called without
	 * @private
	 */
	private static generateRouteData(endpoint: string, method: RequestMethod): RouteData {
		const majorIDMatch = /^\/(?:channels|guilds|webhooks)\/(\d{16,19})/.exec(endpoint);

		// Get the major ID for this route - global otherwise
		const majorID = majorIDMatch?.[1] ?? 'global';

		const baseRoute = endpoint
			// Strip out all IDs
			.replace(/\d{16,19}/g, ':id')
			// Strip out reaction as they fall under the same bucket
			.replace(/\/reactions\/(.*)/, '/reactions/:reaction');

		let exceptions = '';

		// Hard-Code Old Message Deletion Exception (2 week+ old messages are a different bucket)
		// https://github.com/discord/discord-api-docs/issues/1295
		if (method === RequestMethod.Delete && baseRoute === '/channels/:id/messages/:id') {
			const id = /\d{16,19}$/.exec(endpoint)![0];
			const snowflake = DiscordSnowflake.deconstruct(id);
			if (Date.now() - Number(snowflake.timestamp) > 1000 * 60 * 60 * 24 * 14) {
				exceptions += '/Delete Old Message';
			}
		}

		return {
			majorParameter: majorID,
			bucketRoute: baseRoute + exceptions,
			original: endpoint,
		};
	}
}
