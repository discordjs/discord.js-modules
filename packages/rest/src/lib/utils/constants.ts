import { APIVersion } from 'discord-api-types/v8';
import type { RESTOptions } from '../REST';
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const Package = require('../../../package.json');

// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
export const DefaultUserAgent = `DiscordBot (${Package.homepage}, ${Package.version})`;

export const DefaultRestOptions: Required<RESTOptions> = {
	api: 'https://discord.com/api',
	cdn: 'https://cdn.discordapp.com',
	offset: 50,
	retries: 3,
	timeout: 15_000,
	userAgentAppendix: `Node.js ${process.version}`,
	version: APIVersion,
};
