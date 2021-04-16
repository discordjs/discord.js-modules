import { EventEmitter } from 'events';
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
	 * @default '8'
	 */
	version: string;
}

/**
 * Data emitted on `RESTEvents.Debug`
 */
export interface RatelimitData {
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
}

export class REST extends EventEmitter {
	public readonly cdn: CDN;
	public readonly requestManager: RequestManager;

	public constructor(options: Partial<RESTOptions> = {}) {
		super();
		this.cdn = new CDN(options.cdn ?? DefaultRestOptions.cdn);
		this.requestManager = new RequestManager(options)
			.on(RESTEvents.Debug, this.emit.bind(this, RESTEvents.Debug))
			.on(RESTEvents.RateLimited, this.emit.bind(this, RESTEvents.RateLimited));
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

	public on(event: RESTEvents.Debug, listener: (info: string) => void): this;
	public on(event: RESTEvents.RateLimited, listener: (rateLimitInfo: RatelimitData) => void): this;
	public on(event: string, listener: (...args: any[]) => void): this {
		return super.on(event, listener);
	}

	public once(event: RESTEvents.Debug, listener: (info: string) => void): this;
	public once(event: RESTEvents.RateLimited, listener: (rateLimitInfo: RatelimitData) => void): this;
	public once(event: string, listener: (...args: any[]) => void): this {
		return super.once(event, listener);
	}
}
