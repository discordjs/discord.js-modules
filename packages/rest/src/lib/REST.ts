import { EventEmitter } from 'node:events';
import { CDN } from './CDN';
import { InternalRequest, RequestData, RequestManager, RequestMethod, RouteLike } from './RequestManager';
import { DefaultRestOptions, RESTEvents } from './utils/constants';

/**
 * Options to be passed when creating the REST instance
 */
export interface RESTOptions {
	/**
	 * The base api path, without version
	 * @default 'https://discord.com/api'
	 */
	api: string;
	/**
	 * The cdn path
	 * @default 'https://cdn.discordapp.com'
	 */
	cdn: string;
	/**
	 * Additional headers to send for all API requests
	 * @default {}
	 */
	headers: Record<string, string>;
	/**
	 * The number of invalid REST requests (those that return 401, 403, or 429) in a 10 minute window between emitted warnings (0 for no warnings).
	 * That is, if set to 500, warnings will be emitted at invalid request number 500, 1000, 1500, and so on.
	 * @default 0
	 */
	invalidRequestWarningInterval: number;
	/**
	 * How many requests to allow sending per second (Infinity for unlimited, 50 for the standard global limit used by Discord)
	 * @default 50
	 */
	globalRequestsPerSecond: number;
	/**
	 * The extra offset to add to rate limits in milliseconds
	 * @default 50
	 */
	offset: number;
	/**
	 * The number of retries for errors with the 500 code, or errors
	 * that timeout
	 * @default 3
	 */
	retries: number;
	/**
	 * The time to wait in milliseconds before a request is aborted
	 * @default 15_000
	 */
	timeout: number;
	/**
	 * Extra information to add to the user agent
	 * @default `Node.js ${process.version}`
	 */
	userAgentAppendix: string;
	/**
	 * The version of the API to use
	 * @default '9'
	 */
	version: string;
}

/**
 * Data emitted on `RESTEvents.RateLimited`
 */
export interface RateLimitData {
	/**
	 * The time, in milliseconds, until the request-lock is reset
	 */
	timeToReset: number;
	/**
	 * The amount of requests we can perform before locking requests
	 */
	limit: number;
	/**
	 * The HTTP method being performed
	 */
	method: string;
	/**
	 * The bucket hash for this request
	 */
	hash: string;
	/**
	 * The route being hit in this request
	 */
	route: string;
	/**
	 * The major parameter of the route
	 *
	 * For example, in `/channels/x`, this will be `x`.
	 * If there is no major parameter (e.g: `/bot/gateway`) this will be `global`.
	 */
	majorParameter: string;
	/**
	 * Whether the rate limit that was reached was the global limit
	 */
	global: boolean;
}

export interface InvalidRequestWarningData {
	/**
	 * Number of invalid requests that have been made in the window
	 */
	count: number;
	/**
	 * Time in ms remaining before the count resets
	 */
	remainingTime: number;
}

interface RestEvents {
	invalidRequestWarning: [invalidRequestInfo: InvalidRequestWarningData];
	restDebug: [info: string];
	rateLimited: [rateLimitInfo: RateLimitData];
}

export interface REST {
	on<K extends keyof RestEvents>(event: K, listener: (...args: RestEvents[K]) => void): this;
	on<S extends string | symbol>(event: Exclude<S, keyof RestEvents>, listener: (...args: any[]) => void): this;

	once<K extends keyof RestEvents>(event: K, listener: (...args: RestEvents[K]) => void): this;
	once<S extends string | symbol>(event: Exclude<S, keyof RestEvents>, listener: (...args: any[]) => void): this;

	emit<K extends keyof RestEvents>(event: K, ...args: RestEvents[K]): boolean;
	emit<S extends string | symbol>(event: Exclude<S, keyof RestEvents>, ...args: any[]): boolean;

	off<K extends keyof RestEvents>(event: K, listener: (...args: RestEvents[K]) => void): this;
	off<S extends string | symbol>(event: Exclude<S, keyof RestEvents>, listener: (...args: any[]) => void): this;

	removeAllListeners<K extends keyof RestEvents>(event?: K): this;
	removeAllListeners<S extends string | symbol>(event?: Exclude<S, keyof RestEvents>): this;
}

export class REST extends EventEmitter {
	public readonly cdn: CDN;
	public readonly requestManager: RequestManager;

	public constructor(options: Partial<RESTOptions> = {}) {
		super();
		this.cdn = new CDN(options.cdn ?? DefaultRestOptions.cdn);
		this.requestManager = new RequestManager(options)
			.on(RESTEvents.Debug, this.emit.bind(this, RESTEvents.Debug))
			.on(RESTEvents.RateLimited, this.emit.bind(this, RESTEvents.RateLimited))
			.on(RESTEvents.InvalidRequestWarning, this.emit.bind(this, RESTEvents.InvalidRequestWarning));
	}

	/**
	 * Sets the authorization token that should be used for requests
	 * @param token The authorization token to use
	 */
	public setToken(token: string) {
		this.requestManager.setToken(token);
		return this;
	}

	/**
	 * Runs a get request from the api
	 * @param fullRoute The full route to query
	 * @param options Optional request options
	 */
	public get(fullRoute: RouteLike, options: RequestData = {}) {
		return this.request({ ...options, fullRoute, method: RequestMethod.Get });
	}

	/**
	 * Runs a delete request from the api
	 * @param fullRoute The full route to query
	 * @param options Optional request options
	 */
	public delete(fullRoute: RouteLike, options: RequestData = {}) {
		return this.request({ ...options, fullRoute, method: RequestMethod.Delete });
	}

	/**
	 * Runs a post request from the api
	 * @param fullRoute The full route to query
	 * @param options Optional request options
	 */
	public post(fullRoute: RouteLike, options: RequestData = {}) {
		return this.request({ ...options, fullRoute, method: RequestMethod.Post });
	}

	/**
	 * Runs a put request from the api
	 * @param fullRoute The full route to query
	 * @param options Optional request options
	 */
	public put(fullRoute: RouteLike, options: RequestData = {}) {
		return this.request({ ...options, fullRoute, method: RequestMethod.Put });
	}

	/**
	 * Runs a patch request from the api
	 * @param fullRoute The full route to query
	 * @param options Optional request options
	 */
	public patch(fullRoute: RouteLike, options: RequestData = {}) {
		return this.request({ ...options, fullRoute, method: RequestMethod.Patch });
	}

	/**
	 * Runs a request from the api
	 * @param options Request options
	 */
	public request(options: InternalRequest) {
		return this.requestManager.queueRequest(options);
	}
}
