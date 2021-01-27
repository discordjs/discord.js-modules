/**
 * Represents a HTTP error
 */
export class HTTPError extends Error {
	/**
	 * @param message The error message
	 * @param name The name of the error
	 * @param status The status code of the response
	 * @param method The method of the request that erred
	 * @param url The url of the request that erred
	 */
	public constructor(
		message: string,
		public name: string,
		public status: number,
		public method: string,
		public url: string,
	) {
		super(message);
	}
}
