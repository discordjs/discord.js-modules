import { MessageButtonOptions } from 'discord.js';
import { isLinkButtonOptions } from '../src/lib/button';

test('isLinkButtonOptions', () => {
	const buttonData: MessageButtonOptions = {
		style: 'LINK',
		url: 'test',
	};

	expect(isLinkButtonOptions(buttonData)).toBe(true);

	const invalidData: MessageButtonOptions = {
		style: 'PRIMARY',
		customId: '1234',
	};

	expect(isLinkButtonOptions(invalidData)).toBe(false);

	// @ts-ignore
	expect(() => isLinkButtonOptions({})).toThrowError();
});
