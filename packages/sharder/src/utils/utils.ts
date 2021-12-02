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
