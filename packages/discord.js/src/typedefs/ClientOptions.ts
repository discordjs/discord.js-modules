import { IntentsString } from '../structures/client/Intents';
import { BitFieldResolvable } from './BitFieldResolvable';
import { MessageMentionOptions } from './MessageMentionTypes';
import { PartialTypes } from './Partials';
import { PresenceData } from './Presences';

interface HTTPOptions {
	api?: string;
	version?: number;
	host?: string;
	cdn?: string;
	invite?: string;
	template?: string;
}

interface WebSocketOptions {
	large_threshold?: number;
	compress?: boolean;
	properties?: WebSocketProperties;
}

interface WebSocketProperties {
	$os?: string;
	$browser?: string;
	$device?: string;
}

export interface ClientOptions {
	shards?: number | number[] | 'auto';
	shardCount?: number;
	messageCacheMaxSize?: number;
	messageCacheLifetime?: number;
	messageSweepInterval?: number;
	allowedMentions?: MessageMentionOptions;
	invalidRequestWarningInterval?: number;
	partials?: PartialTypes;
	restWsBridgeTimeout?: number;
	restTimeOffset?: number;
	restRequestTimeout?: number;
	restGlobalRateLimit?: number;
	restSweepInterval?: number;
	retryLimit?: number;
	presence?: PresenceData;
	intents: BitFieldResolvable<IntentsString, number>;
	ws?: WebSocketOptions;
	http?: HTTPOptions;
}
