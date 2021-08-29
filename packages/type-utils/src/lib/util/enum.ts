/**
 * Resolves a given type to an enum equivalent value, and
 * checks if it's part of the given enum type.
 * @param type The type to resolve
 * @param object The enum to resolve to
 * @param fields The enum fields to check
 * @returns Whether the type is part of the enum or not.
 */
export function isPartOfEnum(type: string | number, object: Record<string, unknown>, fields: string[]): boolean {
	const resolvedType = typeof type === 'number' ? type : object[type];
	return fields.some((field) => object[field] === resolvedType);
}

/**
 * Throws a type error if the object has no `type field`.
 * @param object The object to type check.
 * @private
 */
export function validateType(object: any) {
	if (!('type' in object)) {
		throw new TypeError('INVALID_TYPE');
	}
}
