import nock from 'nock';
import { REST, DefaultRestOptions, DiscordAPIError, HTTPError } from '../src';

const api = new REST({ timeout: 2000 }).setToken('A-Very-Fake-Token');

let resetAfter = 0;
let serverOutage = true;
let unexpected429 = true;
let unexpected429cf = true;

nock(`${DefaultRestOptions.api}/v${DefaultRestOptions.version}`)
	.persist()
	.replyDate()
	.get('/standard')
	.times(3)
	.reply(function handler(): nock.ReplyFnResult {
		const response = Date.now() >= resetAfter ? 204 : 429;
		resetAfter = Date.now() + 250;
		if (response === 204) {
			return [
				204,
				undefined,
				{
					'x-ratelimit-limit': '1',
					'x-ratelimit-remaining': '0',
					'x-ratelimit-reset-after': ((resetAfter - Date.now()) / 1000).toString(),
					'x-ratelimit-bucket': '80c17d2f203122d936070c88c8d10f33',
					via: '1.1 google',
				},
			];
		}
		return [
			429,
			{
				limit: '1',
				remaining: '0',
				resetAfter: (resetAfter / 1000).toString(),
				bucket: '80c17d2f203122d936070c88c8d10f33',
				retryAfter: (resetAfter - Date.now()).toString(),
			},
			{
				'x-ratelimit-limit': '1',
				'x-ratelimit-remaining': '0',
				'x-ratelimit-reset-after': ((resetAfter - Date.now()) / 1000).toString(),
				'x-ratelimit-bucket': '80c17d2f203122d936070c88c8d10f33',
				'retry-after': (resetAfter - Date.now()).toString(),
				via: '1.1 google',
			},
		];
	})
	.get('/triggerGlobal')
	.reply(function handler(): nock.ReplyFnResult {
		return [
			204,
			{ global: true },
			{
				'x-ratelimit-global': 'true',
				'retry-after': '1',
				via: '1.1 google',
			},
		];
	})
	.get('/regularRequest')
	.reply(204, { test: true })
	.get('/unexpected')
	.times(2)
	.reply(function handler(): nock.ReplyFnResult {
		if (unexpected429) {
			unexpected429 = false;
			return [
				429,
				undefined,
				{
					'retry-after': '1',
					via: '1.1 google',
				},
			];
		}
		return [204, { test: true }];
	})
	.get('/unexpected-cf')
	.times(2)
	.reply(function handler(): nock.ReplyFnResult {
		if (unexpected429cf) {
			unexpected429cf = false;
			return [
				429,
				undefined,
				{
					'retry-after': '1',
				},
			];
		}
		return [204, { test: true }];
	})
	.get('/temp')
	.times(2)
	.reply(function handler(): nock.ReplyFnResult {
		if (serverOutage) {
			serverOutage = false;
			return [500];
		}
		return [204, { test: true }];
	})
	.get('/outage')
	.times(2)
	.reply(500)
	.get('/slow')
	.times(2)
	.delay(3000)
	.reply(200)
	.get('/badRequest')
	.reply(403, { message: 'Missing Permissions', code: 50013 })
	.get('/malformedRequest')
	.reply(601);

test('Handle standard rate limits', async () => {
	const [a, b, c] = [api.get('/standard'), api.get('/standard'), api.get('/standard')];

	expect(await a).toEqual(Buffer.alloc(0));
	const previous1 = Date.now();
	expect(await b).toEqual(Buffer.alloc(0));
	const previous2 = Date.now();
	expect(await c).toEqual(Buffer.alloc(0));
	const now = Date.now();
	expect(previous2).toBeGreaterThanOrEqual(previous1 + 250);
	expect(now).toBeGreaterThanOrEqual(previous2 + 250);
});

test('Handle global rate limits', async () => {
	const earlier = Date.now();
	expect(await api.get('/triggerGlobal')).toEqual({ global: true });
	expect(await api.get('/regularRequest')).toEqual({ test: true });
	expect(Date.now()).toBeGreaterThanOrEqual(earlier + 100);
});

test('Handle unexpected 429', async () => {
	const previous = Date.now();
	expect(await api.get('/unexpected')).toEqual({ test: true });
	expect(Date.now()).toBeGreaterThanOrEqual(previous + 1000);
});

test('Handle unexpected 429 cloudflare', async () => {
	const previous = Date.now();
	expect(await api.get('/unexpected-cf')).toEqual({ test: true });
	expect(Date.now()).toBeGreaterThanOrEqual(previous + 1000);
});

test('Handle temp server outage', async () => {
	expect(await api.get('/temp')).toEqual({ test: true });
});

test('perm server outage', async () => {
	const promise = api.get('/outage');
	await expect(promise).rejects.toThrowError();
	await expect(promise).rejects.toBeInstanceOf(HTTPError);
});

test('server responding too slow', async () => {
	const promise = api.get('/slow');
	await expect(promise).rejects.toThrowError('The user aborted a request.');
}, 10000);

test('Bad Request', async () => {
	const promise = api.get('/badRequest');
	await expect(promise).rejects.toThrowError('Missing Permissions');
	await expect(promise).rejects.toBeInstanceOf(DiscordAPIError);
});

test('malformedRequest', async () => {
	expect(await api.get('/malformedRequest')).toBe(null);
});
