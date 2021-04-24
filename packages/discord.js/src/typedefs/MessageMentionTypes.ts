type MessageMentionTypes = 'roles' | 'users' | 'everyone';

export interface MessageMentionOptions {
	parse?: MessageMentionTypes[];
	roles?: string[]; // Snowflake?
	users?: string[]; // Snowflake?
	repliedUser?: boolean;
}
