import type { InternalRequest } from '../RequestManager';
import type { RequestBody } from './DiscordAPIError';

/**
 * Represents a HTTP error
 */
export class HTTPError extends Error {
	public requestBody: RequestBody;

	/**
	 * @param message The error message
	 * @param name The name of the error
	 * @param status The status code of the response
	 * @param method The method of the request that erred
	 * @param url The url of the request that erred
	 * @param bodyData The unparsed data for the request that errored
	 */
	public constructor(
		message: string,
		public override name: string,
		public status: number,
		public method: string,
		public url: string,
		bodyData: Pick<InternalRequest, 'files' | 'body'>,
	) {
		super(message);

		this.requestBody = { files: bodyData.files, json: bodyData.body };
	}
}
