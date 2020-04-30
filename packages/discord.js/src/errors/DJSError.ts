/* eslint-disable @typescript-eslint/no-use-before-define */
const kCode = Symbol('code');
const messages = new Map();

/**
 * Format the message for an error.
 * @param {string} key Error key
 * @param {Array<*>} args Arguments to pass for util format or as function args
 * @returns {string} Formatted string
 */
function message(key: string, args: any[]): any {
	if (typeof key !== 'string') throw new Error('Error message key must be a string');
	const msg = messages.get(key);
	if (!msg) throw new Error(`An invalid error message key was used: ${key}.`);
	if (typeof msg === 'function') return msg(...args);
	if (args === undefined || args.length === 0) return msg;
	args.unshift(msg);
	return String(...args);
}

/**
 * Extend an error of some sort into a DiscordjsError
 * @param {Error} Base Base error to extend
 * @returns {DiscordjsError}
 */
function makeDiscordjsError(Base: ErrorConstructor): any {
	return class DiscordjsError extends Base {
		public readonly [kCode]: string;

		public constructor(key: string, ...args: any[]) {
			super(message(key, args));
			Object.setPrototypeOf(this, Error.prototype);
			this[kCode] = key;
			if (Error.captureStackTrace) Error.captureStackTrace(this, DiscordjsError);
		}

		public get name(): string {
			return `${super.name} [${this[kCode]}]`;
		}

		public get code(): string {
			return this[kCode];
		}
	};
}

/**
 * Register an error code and message.
 * @param {string} sym Unique name for the error
 * @param {*} val Value of the error
 */
export function register(sym: string, val: any): void {
	messages.set(sym, typeof val === 'function' ? val : String(val));
}

export const Error = makeDiscordjsError(globalThis.Error);
export const TypeError = makeDiscordjsError(globalThis.TypeError);
export const RangeError = makeDiscordjsError(globalThis.RangeError);
