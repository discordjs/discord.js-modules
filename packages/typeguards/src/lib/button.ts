import { MessageButtonOptions, Constants, LinkButtonOptions } from 'discord.js';
import { isPartOfEnum } from './util/enum';

const { MessageButtonStyles } = Constants;

/**
 * Verifies if the given message button options support URLs or not.
 * @param messageButtonOptions The message button options to check.
 * @returns True if the option supports URL's, false otherwise.
 */
export function isLinkButtonOptions(buttonData: MessageButtonOptions): buttonData is LinkButtonOptions {
	if (!('style' in buttonData)) {
		throw new TypeError('INVALID_TYPE');
	}

	return isPartOfEnum(buttonData.style, MessageButtonStyles, ['LINK']);
}
