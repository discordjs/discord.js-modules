import { sleep } from '../src';

test('sleep', async () => {
	const before = Date.now();
	await sleep(100);
	expect(Date.now() - before).toBeGreaterThanOrEqual(100);
});
