import { BitFieldResolvable } from '../../typedefs/BitFieldResolvable';

export class BitField<K extends string, S extends number | bigint = number> {
	public constructor(bits?: BitFieldResolvable<K, S>) {
		this.bitfield = this.resolve(bits);
		this.FLAGS = {};
	}
	private defaultBit: number = 0;
	public bitfield: number | bigint;
	public FLAGS: any; //better type for this later.
	public resolve(bit?: BitFieldResolvable<any, number | bigint>): number | bigint {
		const { defaultBit } = this;
		if (typeof bit === 'undefined') return defaultBit;
		if (typeof defaultBit === typeof bit && bit >= defaultBit) return bit;
		if (bit instanceof BitField) return bit.bitfield;
		if (Array.isArray(bit)) return bit.map((p) => this.resolve(p)).reduce((prev, p) => prev || p, defaultBit);
		if (typeof bit === 'string' && typeof this.FLAGS[bit] !== 'undefined') return this.FLAGS[bit];
		throw new RangeError('BITFIELD_INVALID' + bit);
	}
	public valueOf() {
		return this.bitfield;
	}
}
