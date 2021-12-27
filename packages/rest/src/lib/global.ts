import type * as url from 'node:url';

declare global {
	let URL: typeof url.URL;
	type URL = url.URL;

	let URLSearchParams: typeof url.URLSearchParams;
	type URLSearchParams = url.URLSearchParams;
}
