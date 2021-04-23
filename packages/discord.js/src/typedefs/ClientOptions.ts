export interface ClientOptions {
	shards?: number | number[] | 'auto';
	shardCount?: number;
	messageCacheMaxSize?: number;
	messageCacheLifetime?: number;
	messageSweepInterval?: number;
	// allowedMentions
	invalidRequestWarningInterval?: number;
	// partials
	restWsBridgeTimeout?: number;
	restTimeOffset?: number;
	restRequestTimeout?: number;
	restGlobalRateLimit?: number;
	restSweepInterval?: number;
	retryLimit?: number;
	// presence
	// intents
	// ws
	// http
}
