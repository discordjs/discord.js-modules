import { BitField } from '../structures/client/Bitfield';

export type RecursiveReadonlyArray<T> = ReadonlyArray<T | RecursiveReadonlyArray<T>>;
export type BitFieldResolvable<T extends string, N extends number | bigint> =
	| RecursiveReadonlyArray<T | N | Readonly<BitField<T, N>>>
	| T
	| N
	| Readonly<BitField<T, N>>;
