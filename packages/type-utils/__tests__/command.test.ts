import { ApplicationCommandData, ApplicationCommandOptionData } from 'discord.js';
import {
	isChatInputCommandData,
	isContextMenuCommandData,
	optionDataSupportsChoices,
	optionDataSupportsSubOptions,
} from '../src/lib/command';
import { validateType } from '../src/lib/util/enum';

test('validateType', () => {
	expect(() => validateType({})).toThrowError();
});

test('isContextMenuCommand', () => {
	const nonTypedData: ApplicationCommandData = {
		name: 'test',
		description: 'test',
	};

	expect(isContextMenuCommandData(nonTypedData)).toBe(false);
	expect(isChatInputCommandData(nonTypedData)).toBe(true);

	const typedData: ApplicationCommandData = {
		...nonTypedData,
		type: 'CHAT_INPUT',
	};

	expect(isContextMenuCommandData(typedData)).toBe(false);

	const invalidMessageData: ApplicationCommandData = {
		name: 'test',
		type: 'MESSAGE',
	};

	expect(isContextMenuCommandData(invalidMessageData)).toBe(true);
	expect(isChatInputCommandData(invalidMessageData)).toBe(false);

	const invalidUserData: ApplicationCommandData = {
		name: 'test',
		type: 'USER',
	};

	expect(isContextMenuCommandData(invalidUserData)).toBe(true);
});

test('optionsDataSupportsChoices', () => {
	const subCommandData: ApplicationCommandOptionData = {
		name: 'test',
		type: 'SUB_COMMAND',
		description: 'test',
	};

	expect(optionDataSupportsChoices(subCommandData)).toBe(false);

	const stringData: ApplicationCommandOptionData = {
		name: 'test',
		type: 'STRING',
		description: 'test',
	};

	expect(optionDataSupportsChoices(stringData)).toBe(true);
});

test('optionsDataSupportsSubOptions', () => {
	const subCommandData: ApplicationCommandOptionData = {
		name: 'test',
		type: 'SUB_COMMAND',
		description: 'test',
	};

	expect(optionDataSupportsSubOptions(subCommandData)).toBe(true);

	const stringData: ApplicationCommandOptionData = {
		name: 'test',
		type: 'STRING',
		description: 'test',
	};

	expect(optionDataSupportsSubOptions(stringData)).toBe(false);
});
