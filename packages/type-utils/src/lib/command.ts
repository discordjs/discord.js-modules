import {
	ApplicationCommandData,
	UserApplicationCommandData,
	MessageApplicationCommandData,
	ApplicationCommandChoicesData,
	ApplicationCommandOptionData,
	ApplicationCommandSubCommandData,
	ApplicationCommandSubGroupData,
	ChatInputApplicationCommandData,
	Constants,
} from 'discord.js';
import { isPartOfEnum, validateType } from './util/enum';

const { ApplicationCommandOptionTypes, ApplicationCommandTypes } = Constants;

/**
 * Whether or not the command supports a description or options.
 * @param commandData The application command data to check.
 * @returns True if the command is a context menu command, false otherwise.
 */
export function isContextMenuCommandData(
	commandData: ApplicationCommandData,
): commandData is UserApplicationCommandData | MessageApplicationCommandData {
	if (!commandData.type) {
		return false;
	}

	validateType(commandData);

	return isPartOfEnum(commandData.type, ApplicationCommandTypes, ['MESSAGE', 'USER']);
}

/**
 * Whether or not the command supports a description or options.
 * @param commandData The application command data to check.
 * @returns True if the command is a chat input command, false otherwise.
 */
export function isChatInputCommandData(
	commandData: ApplicationCommandData,
): commandData is ChatInputApplicationCommandData {
	return !isContextMenuCommandData(commandData);
}

/**
 * Verifies if the given command option data supports choices or not.
 * @param commandOptionData The command option data to check.
 * @returns True if the option supports choices, false otherwise.
 */
export function optionDataSupportsChoices(
	optionData: ApplicationCommandOptionData,
): optionData is ApplicationCommandChoicesData {
	validateType(optionData);
	return isPartOfEnum(optionData.type, ApplicationCommandOptionTypes, ['INTEGER', 'STRING', 'NUMBER']);
}

/**
 * Verifies if the given command option data supports choices or not.
 * @param {ApplicationCommandOptionData} commandOptionData The command option data to check.
 * @returns {boolean} True if the option supports choices, false otherwise.
 */
export function optionDataSupportsSubOptions(
	optionData: ApplicationCommandOptionData,
): optionData is ApplicationCommandSubGroupData | ApplicationCommandSubCommandData {
	validateType(optionData);
	return isPartOfEnum(optionData.type, ApplicationCommandOptionTypes, ['SUB_COMMAND', 'SUB_COMMAND_GROUP']);
}
