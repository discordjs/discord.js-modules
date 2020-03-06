import { sum } from '../src';

test('no arguments', () => {
	expect(sum()).toBe(0);
});

test('arguments', () => {
	expect(sum(1, 2)).toBe(3);
});
