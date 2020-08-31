import { Collection } from '../src';

let coll: Collection<string, any>;
beforeEach(() => {
	coll = new Collection();
});

let object: unknown;
let string: string;
let boolean: boolean;
let symbol: symbol;
let array: number[];
beforeEach(() => {
	coll.set('a', 1);
	coll.set('b', 2);
	coll.set('c', 3);

	object = {};
	string = 'Hi';
	boolean = false;
	symbol = Symbol('testArg');
	array = [1, 2, 3];

	coll.set('d', object);
	coll.set('e', string);
	coll.set('f', boolean);
	coll.set('g', symbol);
	coll.set('h', array);
});

test('do basic map operations', () => {
	coll.clear();
	coll.set('a', 1);
	expect(coll.size).toBe(1);
	expect(coll.has('a')).toBeTruthy();
	expect(coll.get('a')).toBe(1);
	coll.delete('a');
	expect(coll.has('a')).toBeFalsy();
	expect(coll.get('a')).toBe(undefined);
	coll.clear();
	expect(coll.size).toBe(0);
});

describe('array', () => {
	beforeEach(() => {
		coll.clear();
	});

	test('convert collection to array with caching', () => {
		coll.set('a', 1);
		coll.set('b', 2);
		coll.set('c', 3);
		const array1 = coll.array();
		expect(array1).toStrictEqual([1, 2, 3]);
		expect(array1).toBe(coll.array());
		coll.set('d', 4);
		const array2 = coll.array();
		expect(array2).toStrictEqual([1, 2, 3, 4]);
		expect(array2).toBe(coll.array());
	});
});

describe('keyArray', () => {
	beforeEach(() => {
		coll.clear();
	});

	test('convert collection to keyArray with caching', () => {
		coll.set('a', 1);
		coll.set('b', 2);
		coll.set('c', 3);
		const array1 = coll.keyArray();
		expect(array1).toStrictEqual(['a', 'b', 'c']);
		expect(array1).toBe(coll.keyArray());
		coll.set('d', 4);
		const array2 = coll.keyArray();
		expect(array2).toStrictEqual(['a', 'b', 'c', 'd']);
		expect(array2).toBe(coll.keyArray());
	});
});

describe('first', () => {
	beforeEach(() => {
		coll.clear();
		coll.set('a', 1);
		coll.set('b', 2);
	});

	test('get the first item of the collection', () => {
		expect(coll.first()).toBe(1);
	});

	test('get the first 3 items of the collection where size equals', () => {
		coll.set('c', 3);
		expect(coll.first(3)).toStrictEqual([1, 2, 3]);
	});

	test('get the first 3 items of the collection where size is less', () => {
		expect(coll.first(3)).toStrictEqual([1, 2]);
	});

	test('get the last item of the collection by passing negative', () => {
		expect(coll.first(-1)).toStrictEqual([2]);
	});
});

describe('firstKey', () => {
	beforeEach(() => {
		coll.clear();
		coll.set('a', 1);
		coll.set('b', 2);
	});

	test('get the first key of the collection', () => {
		expect(coll.firstKey()).toBe('a');
	});

	test('get the first 3 keys of the collection where size equals', () => {
		coll.set('c', 3);
		expect(coll.firstKey(3)).toStrictEqual(['a', 'b', 'c']);
	});

	test('get the first 3 keys of the collection where size is less', () => {
		expect(coll.firstKey(3)).toStrictEqual(['a', 'b']);
	});

	test('get the last item of the collection by passing negative', () => {
		expect(coll.firstKey(-1)).toStrictEqual(['b']);
	});
});

describe('last', () => {
	beforeEach(() => {
		coll.clear();
		coll.set('a', 1);
		coll.set('b', 2);
	});

	test('get the last 0 items of the collection', () => {
		expect(coll.last(0)).toStrictEqual([]);
	});

	test('get the last item of the collection', () => {
		expect(coll.last()).toBe(2);
	});

	test('get the last 3 items of the collection', () => {
		coll.set('c', 3);
		expect(coll.last(3)).toStrictEqual([1, 2, 3]);
	});

	test('get the last 3 items of the collection where size is less', () => {
		expect(coll.last(3)).toStrictEqual([1, 2]);
	});

	test('get the first item of the collection by passing negative', () => {
		expect(coll.last(-1)).toStrictEqual([1]);
	});
});

describe('lastKey', () => {
	beforeEach(() => {
		coll.clear();
		coll.set('a', 1);
		coll.set('b', 2);
	});

	test('get the last 0 keys of the collection', () => {
		expect(coll.lastKey(0)).toStrictEqual([]);
	});

	test('get the last key of the collection', () => {
		expect(coll.lastKey()).toBe('b');
	});

	test('get the last 3 keys of the collection', () => {
		coll.set('c', 3);
		expect(coll.lastKey(3)).toStrictEqual(['a', 'b', 'c']);
	});

	test('get the last 3 keys of the collection where size is less', () => {
		expect(coll.lastKey(3)).toStrictEqual(['a', 'b']);
	});

	test('get the first key of the collection by passing negative', () => {
		expect(coll.lastKey(-1)).toStrictEqual(['a']);
	});
});

describe('random', () => {
	let numbers: number[];
	beforeEach(() => {
		coll.clear();
		const chars = 'abcdefghijklmnopqrstuvwxyz';
		numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26];

		for (let i = 0; i < chars.length; i++) coll.set(chars[i], numbers[i]);
	});

	test('random select item from an empty collection', () => {
		const random = coll.random();
		expect(numbers).toContain(random);
	});

	test('random select 0 items from a collection', () => {
		const random = coll.random(0);
		expect(random.length).toBe(0);
		expect(random).toStrictEqual([]);

		const set = new Set(random);
		expect(set.size).toBe(random.length);
	});

	test('random select 5 items from a collection', () => {
		const random = coll.random(5);
		expect(random.length).toBe(5);

		const set = new Set(random);
		expect(set.size).toBe(random.length);
	});
});

describe('randomKey', () => {
	let chars: string;
	beforeEach(() => {
		coll.clear();
		chars = 'abcdefghijklmnopqrstuvwxyz';
		const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26];

		for (let i = 0; i < chars.length; i++) coll.set(chars[i], numbers[i]);
	});

	test('random key select key from an empty collection', () => {
		const random = coll.randomKey();
		expect(chars).toMatch(random);
	});

	test('random key select 0 keys from a collection', () => {
		const random = coll.randomKey(0);
		expect(random.length).toBe(0);
		expect(random).toStrictEqual([]);

		const set = new Set(random);
		expect(set.size).toBe(random.length);
	});

	test('random key select 5 keys from a collection', () => {
		const random = coll.randomKey(5);
		expect(random.length).toBe(5);

		const set = new Set(random);
		expect(set.size).toBe(random.length);
	});
});

describe('find', () => {
	test('find an item in the collection', () => {
		expect(coll.find((x) => x === 1)).toBe(1);
		expect(coll.find((x) => x === 10)).toBeUndefined();
	});

	test('find thisArg', () => {
		coll.find(function thisArgTest1(value) {
			expect(this.valueOf()).toBe(1);
			return value === this;
		}, 1);

		coll.find(function thisArgTest2(value) {
			expect(this).toBe(object);
			expect(this.constructor).toBe(Object);
			return value === this;
		}, object);

		coll.find(function thisArgTest3(value) {
			expect(this.valueOf()).toBe(string);
			return value === this;
		}, string);

		coll.find(function thisArgTest4(value) {
			expect(this.valueOf()).toBe(boolean);
			return value === this;
		}, boolean);

		coll.find(function thisArgTest5(value) {
			expect(this.valueOf()).toBe(symbol);
			return value === this;
		}, symbol);

		coll.find(function thisArgTest6(value) {
			expect(this).toBe(array);
			expect(Array.isArray(this)).toBeTruthy();
			return value === this;
		}, array);
	});
});

describe('findKey', () => {
	test('find a key in the collection', () => {
		expect(coll.findKey((x) => x === 1)).toBe('a');
		expect(coll.findKey((x) => x === 'c')).toBeUndefined();
	});

	test('findKey thisArg', () => {
		coll.findKey(function thisArgTest1(value) {
			expect(this.valueOf()).toBe(1);
			return value === this;
		}, 1);

		coll.findKey(function thisArgTest2(value) {
			expect(this).toBe(object);
			expect(this.constructor).toBe(Object);
			return value === this;
		}, object);

		coll.findKey(function thisArgTest3(value) {
			expect(this.valueOf()).toBe(string);
			return value === this;
		}, string);

		coll.findKey(function thisArgTest4(value) {
			expect(this.valueOf()).toBe(boolean);
			return value === this;
		}, boolean);

		coll.findKey(function thisArgTest5(value) {
			expect(this.valueOf()).toBe(symbol);
			return value === this;
		}, symbol);

		coll.findKey(function thisArgTest6(value) {
			expect(this).toBe(array);
			expect(Array.isArray(this)).toBeTruthy();
			return value === this;
		}, array);
	});
});

describe('sweep', () => {
	test('sweep items from the collection', () => {
		coll.clear();
		coll.set('a', 1);
		coll.set('b', 2);
		coll.set('c', 3);
		const n1 = coll.sweep((x) => x === 2);
		expect(n1).toBe(1);
		expect(coll.array()).toStrictEqual([1, 3]);
		const n2 = coll.sweep((x) => x === 4);
		expect(n2).toBe(0);
		expect(coll.array()).toStrictEqual([1, 3]);
	});

	test('sweep thisArg', () => {
		coll.sweep(function thisArgTest1(value) {
			expect(this.valueOf()).toBe(1);
			return value === this;
		}, 1);

		coll.sweep(function thisArgTest2(value) {
			expect(this).toBe(object);
			expect(this.constructor).toBe(Object);
			return value === this;
		}, object);

		coll.sweep(function thisArgTest3(value) {
			expect(this.valueOf()).toBe(string);
			return value === this;
		}, string);

		coll.sweep(function thisArgTest4(value) {
			expect(this.valueOf()).toBe(boolean);
			return value === this;
		}, boolean);

		coll.sweep(function thisArgTest5(value) {
			expect(this.valueOf()).toBe(symbol);
			return value === this;
		}, symbol);

		coll.sweep(function thisArgTest6(value) {
			expect(this).toBe(array);
			expect(Array.isArray(this)).toBeTruthy();
			return value === this;
		}, array);
	});
});

describe('filter', () => {
	test('filter items from the collection', () => {
		coll.clear();
		coll.set('a', 1);
		coll.set('b', 2);
		coll.set('c', 3);
		const filtered = coll.filter((x) => x % 2 === 1);
		expect(coll.size).toBe(3);
		expect(filtered.size).toBe(2);
		expect(filtered.array()).toStrictEqual([1, 3]);
	});

	test('filter thisArg', () => {
		coll.filter(function thisArgTest1(value) {
			expect(this.valueOf()).toBe(1);
			return value === this;
		}, 1);

		coll.filter(function thisArgTest2(value) {
			expect(this).toBe(object);
			expect(this.constructor).toBe(Object);
			return value === this;
		}, object);

		coll.filter(function thisArgTest3(value) {
			expect(this.valueOf()).toBe(string);
			return value === this;
		}, string);

		coll.filter(function thisArgTest4(value) {
			expect(this.valueOf()).toBe(boolean);
			return value === this;
		}, boolean);

		coll.filter(function thisArgTest5(value) {
			expect(this.valueOf()).toBe(symbol);
			return value === this;
		}, symbol);

		coll.filter(function thisArgTest6(value) {
			expect(this).toBe(array);
			expect(Array.isArray(this)).toBeTruthy();
			return value === this;
		}, array);
	});
});

describe('partition', () => {
	test('partition a collection into two collections', () => {
		coll.clear();
		coll.set('a', 1);
		coll.set('b', 2);
		coll.set('c', 3);
		coll.set('d', 4);
		coll.set('e', 5);
		coll.set('f', 6);
		const [even, odd] = coll.partition((x) => x % 2 === 0);
		expect(even.array()).toStrictEqual([2, 4, 6]);
		expect(odd.array()).toStrictEqual([1, 3, 5]);
	});

	test('partition thisArg', () => {
		coll.partition(function thisArgTest1(value) {
			expect(this.valueOf()).toBe(1);
			return value === this;
		}, 1);

		coll.partition(function thisArgTest2(value) {
			expect(this).toBe(object);
			expect(this.constructor).toBe(Object);
			return value === this;
		}, object);

		coll.partition(function thisArgTest3(value) {
			expect(this.valueOf()).toBe(string);
			return value === this;
		}, string);

		coll.partition(function thisArgTest4(value) {
			expect(this.valueOf()).toBe(boolean);
			return value === this;
		}, boolean);

		coll.partition(function thisArgTest5(value) {
			expect(this.valueOf()).toBe(symbol);
			return value === this;
		}, symbol);

		coll.partition(function thisArgTest6(value) {
			expect(this).toBe(array);
			expect(Array.isArray(this)).toBeTruthy();
			return value === this;
		}, array);
	});
});

describe('flatMap', () => {
	beforeEach(() => {
		coll.clear();
	});

	test('flatMap items in a collection into a single collection', () => {
		const coll2 = new Collection<string, any>();
		const coll3 = new Collection<string, number>();
		coll2.set('z', 1);
		coll2.set('x', 2);
		coll3.set('c', 3);
		coll3.set('v', 4);
		coll.set('a', { a: coll2 });
		coll.set('b', { a: coll3 });
		const mapped = coll.flatMap((x) => x.a);
		expect(mapped.array()).toStrictEqual([1, 2, 3, 4]);
	});
});

describe('map', () => {
	test('map items in a collection into an array', () => {
		coll.clear();
		coll.set('a', 1);
		coll.set('b', 2);
		coll.set('c', 3);
		const mapped = coll.map((x: number) => x + 1);
		expect(mapped).toStrictEqual([2, 3, 4]);
	});

	test('map thisArg', () => {
		coll.map(function thisArgTest1(value) {
			expect(this.valueOf()).toBe(1);
			return value === this;
		}, 1);

		coll.map(function thisArgTest2(value) {
			expect(this).toBe(object);
			expect(this.constructor).toBe(Object);
			return value === this;
		}, object);

		coll.map(function thisArgTest3(value) {
			expect(this.valueOf()).toBe(string);
			return value === this;
		}, string);

		coll.map(function thisArgTest4(value) {
			expect(this.valueOf()).toBe(boolean);
			return value === this;
		}, boolean);

		coll.map(function thisArgTest5(value) {
			expect(this.valueOf()).toBe(symbol);
			return value === this;
		}, symbol);

		coll.map(function thisArgTest6(value) {
			expect(this).toBe(array);
			expect(Array.isArray(this)).toBeTruthy();
			return value === this;
		}, array);
	});
});

describe('mapValues', () => {
	beforeEach(() => {
		coll.clear();
	});

	test('map items in a collection into a collection', () => {
		coll.set('a', 1);
		coll.set('b', 2);
		coll.set('c', 3);
		const mapped = coll.mapValues((x: number) => x + 1);
		expect(mapped.array()).toStrictEqual([2, 3, 4]);
	});

	test('mapValues thisArg', () => {
		coll.mapValues(function thisArgTest1(value) {
			expect(this.valueOf()).toBe(1);
			return value === this;
		}, 1);

		coll.mapValues(function thisArgTest2(value) {
			expect(this).toBe(object);
			expect(this.constructor).toBe(Object);
			return value === this;
		}, object);

		coll.mapValues(function thisArgTest3(value) {
			expect(this.valueOf()).toBe(string);
			return value === this;
		}, string);

		coll.mapValues(function thisArgTest4(value) {
			expect(this.valueOf()).toBe(boolean);
			return value === this;
		}, boolean);

		coll.mapValues(function thisArgTest5(value) {
			expect(this.valueOf()).toBe(symbol);
			return value === this;
		}, symbol);

		coll.mapValues(function thisArgTest6(value) {
			expect(this).toBe(array);
			expect(Array.isArray(this)).toBeTruthy();
			return value === this;
		}, array);
	});
});

describe('some', () => {
	beforeEach(() => {
		coll.clear();
	});

	test('check if some items pass a predicate', () => {
		coll.set('a', 1);
		coll.set('b', 2);
		coll.set('c', 3);
		expect(coll.some((x) => x === 2)).toBeTruthy();
	});

	test('some thisArg', () => {
		coll.some(function thisArgTest1(value) {
			expect(this.valueOf()).toBe(1);
			return value === this;
		}, 1);

		coll.some(function thisArgTest2(value) {
			expect(this).toBe(object);
			expect(this.constructor).toBe(Object);
			return value === this;
		}, object);

		coll.some(function thisArgTest3(value) {
			expect(this.valueOf()).toBe(string);
			return value === this;
		}, string);

		coll.some(function thisArgTest4(value) {
			expect(this.valueOf()).toBe(boolean);
			return value === this;
		}, boolean);

		coll.some(function thisArgTest5(value) {
			expect(this.valueOf()).toBe(symbol);
			return value === this;
		}, symbol);

		coll.some(function thisArgTest6(value) {
			expect(this).toBe(array);
			expect(Array.isArray(this)).toBeTruthy();
			return value === this;
		}, array);
	});
});

describe('every', () => {
	test('check if every item pass a predicate', () => {
		expect(coll.every((x) => x === 2)).toBeFalsy();
		coll.clear();
		coll.set('a', 1);
		coll.set('b', 1);
		expect(coll.every((x) => x === 1)).toBeTruthy();
	});

	test('every thisArg', () => {
		coll.every(function thisArgTest1(value) {
			expect(this.valueOf()).toBe(1);
			return value === this;
		}, 1);

		coll.every(function thisArgTest2(value) {
			expect(this).toBe(object);
			expect(this.constructor).toBe(Object);
			return value === this;
		}, object);

		coll.every(function thisArgTest3(value) {
			expect(this.valueOf()).toBe(string);
			return value === this;
		}, string);

		coll.every(function thisArgTest4(value) {
			expect(this.valueOf()).toBe(boolean);
			return value === this;
		}, boolean);

		coll.every(function thisArgTest5(value) {
			expect(this.valueOf()).toBe(symbol);
			return value === this;
		}, symbol);

		coll.every(function thisArgTest6(value) {
			expect(this).toBe(array);
			expect(Array.isArray(this)).toBeTruthy();
			return value === this;
		}, array);
	});
});

describe('reduce', () => {
	beforeEach(() => {
		coll.clear();
		coll.set('a', 1);
		coll.set('b', 2);
		coll.set('c', 3);
	});

	test('reduce collection into a single value with initial value', () => {
		const sum = coll.reduce((a: number, x: number) => a + x, 0);
		expect(sum).toBe(6);
	});

	test('reduce collection into a single value without initial value', () => {
		const sum = coll.reduce((a: number, x: number) => a + x);
		expect(sum).toBe(6);
	});

	test('reduce empty collection without initial value', () => {
		coll.clear();
		expect(() => coll.reduce((a: number, x: number) => a + x)).toThrow(
			/^Reduce of empty collection with no initial value$/,
		);
	});
});

describe('each', () => {
	beforeEach(() => {
		coll.clear();
	});

	test('iterate over each item', () => {
		coll.set('a', 1);
		coll.set('b', 2);
		coll.set('c', 3);
		const a: [string, number][] = [];
		coll.each((v, k) => a.push([k, v]));
		expect(a).toStrictEqual([
			['a', 1],
			['b', 2],
			['c', 3],
		]);
	});
});

describe('tap', () => {
	test('tap the collection', () => {
		coll.tap((c) => expect(c).toBe(coll));
	});

	test('tap thisArg', () => {
		coll.tap(function thisArgTest1() {
			expect(this.valueOf()).toBe(1);
		}, 1);

		coll.tap(function thisArgTest2() {
			expect(this).toBe(object);
			expect(this.constructor).toBe(Object);
		}, object);

		coll.tap(function thisArgTest3() {
			expect(this.valueOf()).toBe(string);
		}, string);

		coll.tap(function thisArgTest4() {
			expect(this.valueOf()).toBe(boolean);
		}, boolean);

		coll.tap(function thisArgTest5() {
			expect(this.valueOf()).toBe(symbol);
		}, symbol);

		coll.tap(function thisArgTest6() {
			expect(this).toBe(array);
			expect(Array.isArray(this)).toBeTruthy();
		}, array);
	});
});

describe('clone', () => {
	beforeEach(() => {
		coll.clear();
	});

	test('shallow clone the collection', () => {
		coll.set('a', 1);
		coll.set('b', 2);
		coll.set('c', 3);
		const clone = coll.clone();
		expect(coll.array()).toStrictEqual(clone.array());
	});
});

describe('concat', () => {
	beforeEach(() => {
		coll.clear();
	});

	test('merge multiple collections', () => {
		const coll2 = new Collection<string, number>();
		const coll3 = new Collection<string, number>();
		coll.set('a', 1);
		coll2.set('b', 2);
		coll3.set('c', 3);
		const merged = coll.concat(coll2, coll3);
		expect(merged.array()).toStrictEqual([1, 2, 3]);
		expect(coll).not.toBe(merged);
	});
});

describe('equals', () => {
	let coll2: Collection<string, number>;
	beforeEach(() => {
		coll.clear();
		coll2 = new Collection();
	});

	test('check equality without collection bypassing tsc', () => {
		// @ts-expect-error
		expect(coll.equals()).toBeFalsy();
	});

	test('check equality of the same collection', () => {
		coll.set('a', 1);
		expect(coll.equals(coll)).toBeTruthy();
		coll.clear();
		coll.set('a', 1);
		expect(coll.equals(coll2)).toBeFalsy();
		coll.clear();
		coll.set('a', 1);
		coll2.set('a', 2);
		expect(coll.equals(coll2)).toBeFalsy();
	});

	test('check equality of two collections', () => {
		coll.set('a', 1);
		coll2.set('a', 1);
		expect(coll.equals(coll2)).toBeTruthy();
		coll2.set('b', 2);
		expect(coll2.equals(coll)).toBeFalsy();
		coll2.clear();
		expect(coll.equals(coll2)).toBeFalsy();
	});
});

describe('sort', () => {
	beforeEach(() => {
		coll.clear();
		coll.set('a', 3);
		coll.set('b', 2);
		coll.set('c', 1);
	});

	test('sort a collection in place', () => {
		expect(coll.array()).toStrictEqual([3, 2, 1]);
		coll.sort();
		expect(coll.array()).toStrictEqual([1, 2, 3]);
	});

	test('sort a collection in place (custom sort)', () => {
		expect(coll.array()).toStrictEqual([3, 2, 1]);
		coll.sort((a, b) => a - b);
		expect(coll.array()).toStrictEqual([1, 2, 3]);
		coll.sort((a, b) => b - a);
		expect(coll.array()).toStrictEqual([3, 2, 1]);
	});
});

describe('intersect', () => {
	beforeEach(() => {
		coll.clear();
	});

	test('intersect two collections', () => {
		const coll2 = new Collection<string, number>();
		coll.set('a', 1);
		coll2.set('a', 1);
		expect(coll.intersect(coll2).array()).toStrictEqual([1]);
		coll2.set('b', 2);
		coll.set('c', 3);
		expect(coll.intersect(coll2).array()).toStrictEqual([1]);
	});
});

describe('difference', () => {
	beforeEach(() => {
		coll.clear();
	});

	test('difference between two collections', () => {
		const coll2 = new Collection<string, number>();
		coll.set('a', 1);
		coll2.set('a', 1);
		expect(coll.difference(coll2).array()).toStrictEqual([]);
		coll2.set('b', 2);
		coll.set('c', 3);
		expect(coll.difference(coll2).array()).toStrictEqual([2, 3]);
	});
});

describe('sorted', () => {
	beforeEach(() => {
		coll.clear();
		coll.set('a', 3);
		coll.set('b', 2);
		coll.set('c', 1);
	});

	test('sort a collection', () => {
		expect(coll.array()).toStrictEqual([3, 2, 1]);
		const sorted2 = coll.sorted();
		expect(coll.array()).toStrictEqual([3, 2, 1]);
		expect(sorted2.array()).toStrictEqual([1, 2, 3]);
	});

	test('sort a collection (custom sort)', () => {
		expect(coll.array()).toStrictEqual([3, 2, 1]);
		const sorted = coll.sorted((a, b) => a - b);
		expect(coll.array()).toStrictEqual([3, 2, 1]);
		expect(sorted.array()).toStrictEqual([1, 2, 3]);
		const sorted2 = coll.sorted();
		expect(sorted2.array()).toStrictEqual([1, 2, 3]);
	});
});
