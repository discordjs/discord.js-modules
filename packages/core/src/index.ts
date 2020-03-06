export function sum(...a: number[]) {
	return a.reduce((a, v) => a + v, 0);
}
