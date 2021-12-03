import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

export const pathToFilePredicate = z
	.string()
	.transform(resolve)
	.refine((path) => statSync(path).isFile(), { message: 'Could not resolve path to a file' });

export function createDeferredPromise<T = unknown>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason?: unknown) => void;

	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return { promise, resolve, reject };
}

export interface DeferredPromise<T = unknown> {
	resolve(value: T | PromiseLike<T>): void;
	reject(reason?: unknown): void;
	promise: Promise<T>;
}
