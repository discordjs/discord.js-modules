interface DiscordErrorFieldInformation {
	code: string;
	message: string;
}

interface DiscordErrorInternalErrors {
	_errors: DiscordErrorFieldInformation[];
}

type DiscordError = DiscordErrorInternalErrors | DiscordErrorFieldInformation | { [k: string]: DiscordError } | string;

export interface DiscordErrorData {
	code: number;
	message: string;
	errors?: DiscordError;
}

function isErrorInternalErrors(error: any): error is DiscordErrorInternalErrors {
	return Reflect.has(error, '_errors');
}

function isErrorResponse(error: any): error is DiscordErrorFieldInformation {
	return typeof Reflect.get(error, 'message') === 'string';
}

/**
 * Represents an API error returned by Discord
 * @extends Error
 */
export class DiscordAPIError extends Error {
	/**
	 * @param message The error message reported by discord
	 * @param code The error code reported by discord
	 * @param status The status code of the response
	 * @param method The method of the request that erred
	 * @param url The url of the request that erred
	 */
	public constructor(
		jsonBody: DiscordErrorData,
		public code: number,
		public status: number,
		public method: string,
		public url: string,
	) {
		super(DiscordAPIError.getMessage(jsonBody));
	}

	/**
	 * The name of the error
	 */
	public get name(): string {
		return `${DiscordAPIError.name}[${this.code}]`;
	}

	private static getMessage(error: DiscordErrorData) {
		let flattened = '';
		if (error.errors) {
			flattened = [...this.flattenDiscordError(error.errors)].join('\n');
		}
		return error.message && flattened
			? `${error.message}\n${flattened}`
			: error.message || flattened || 'Unknown Error';
	}

	private static *flattenDiscordError(obj: DiscordError, key = ''): IterableIterator<string> {
		for (const [k, v] of Object.entries(obj)) {
			if (k === 'message') continue;

			const newKey = key ? (Number.isNaN(Number(k)) ? `${key}.${k}` : `${key}[${k}]`) : k;

			if (typeof v === 'string') {
				yield v;
			} else if (isErrorInternalErrors(v)) {
				yield `${newKey}: ${v._errors.map((e) => `[${e.code}]: ${e.message}`).join(' ')}`;
			} else if (isErrorResponse(v)) {
				yield `${v.code ? `${v.code}: ` : ''}${v.message}`.trim();
			} else {
				yield* this.flattenDiscordError(v, newKey);
			}
		}
	}
}
