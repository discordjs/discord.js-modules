import { EventEmitter } from 'node:events';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { z } from 'zod';
import type { IMessageHandlerConstructor } from './messages/IMessageHandler';
import { JsonMessageHandler } from './messages/JsonMessageHandler';
import type { IShardHandler, IShardHandlerConstructor, ShardHandlerSendOptions } from './shards/IShardHandler';
import { ProcessShardHandler } from './shards/ProcessShardHandler';
import type { NonNullObject } from './utils/types';

const shardingManagerOptionsPredicate = z.strictObject({
	shardList: z.literal('auto').or(z.array(z.number().positive().int()).nonempty()).default('auto'),
	totalShards: z.literal('auto').or(z.number().int().gte(1)).default('auto'),
	token: z.string().nonempty().nullish().default(null),
	respawn: z.boolean().default(true),
	shardHandlerBuilder: z.object({ spawn: z.function(), validate: z.function() }).optional(),
	messageHandlerBuilder: z.object({ build: z.function() }).optional(),
	shardOptions: z.object({}).default({}),
});

const shardingManagerSpawnOptions = z.strictObject({
	amount: z.literal('auto').or(z.number().int().gte(1)).optional(),
	delay: z.number().int().positive().default(5500),
	timeout: z.number().int().positive().default(30_000),
});

const shardingManagerRespawnAllOptions = z.strictObject({
	shardDelay: z.number().int().positive().default(5000),
	respawnDelay: z.number().int().positive().default(500),
	timeout: z.number().int().positive().or(z.literal(-1)).or(z.literal(Infinity)).default(30000),
});

export class ShardingManager<ShardOptions extends NonNullObject = NonNullObject> extends EventEmitter {
	public readonly path: string;

	/**
	 * Number of total shards of all shard managers or "auto".
	 */
	public shardList: [number, ...number[]] | 'auto';

	/**
	 * List of shards to spawn or "auto".
	 */
	public totalShards: number | 'auto';

	public readonly respawn: boolean;

	public readonly shardHandlerBuilder: IShardHandlerConstructor<ShardOptions>;
	public readonly shardOptions: ShardOptions;

	public readonly messageHandlerBuilder: IMessageHandlerConstructor;

	/**
	 * Token to use for automatic shard count and passing to shards.
	 */
	public readonly token: string | null;

	public readonly shards = new Map<number, IShardHandler>();

	public constructor(path: string, options: ShardingManagerOptions<ShardOptions> = {}) {
		super();

		this.path = resolve(path);
		if (!statSync(this.path).isFile()) {
			throw new Error(`Path '${this.path}' did not resolve to a file`);
		}

		const resolved = shardingManagerOptionsPredicate.parse(options);
		this.shardList = resolved.shardList;
		this.totalShards = resolved.totalShards;
		this.respawn = resolved.respawn;
		this.token = resolved.token?.replace(/^Bot\s*/i, '') ?? null;

		this.shardHandlerBuilder =
			options.shardHandlerBuilder ?? (ProcessShardHandler as unknown as IShardHandlerConstructor<ShardOptions>);
		this.shardOptions = this.shardHandlerBuilder.validate(options.shardOptions);

		this.messageHandlerBuilder = options.messageHandlerBuilder ?? JsonMessageHandler;
	}

	public async spawn(options: ShardingManagerSpawnOptions) {
		const resolved = shardingManagerSpawnOptions.parse(options);
		let amount = resolved.amount ?? this.totalShards;

		if (amount === 'auto') {
			// TODO: amount = await Util.fetchRecommendedShards(this.token);
			amount = 1;
		}

		if (this.shards.size >= amount) throw new Error('Shards have already spawned.');
		if (this.shardList === 'auto' || this.totalShards === 'auto' || this.totalShards !== amount) {
			this.shardList = [...Array(amount).keys()] as [number, ...number[]];
		}

		if (this.totalShards === 'auto' || this.totalShards !== amount) {
			this.totalShards = amount;
		}

		const shardIds = z.number().int().gte(0).lt(amount).array().parse(this.shardList);

		// Spawn the shards
		for (const shardId of shardIds) {
			await Promise.all([
				this.spawnShard(shardId),
				resolved.delay > 0 && this.shards.size !== shardIds.length ? sleep(resolved.delay) : Promise.resolve(),
			]);
		}
	}

	public async spawnShard(shardId: number) {
		const shard = await this.shardHandlerBuilder.spawn(shardId, this, this.messageHandlerBuilder);
		this.shards.set(shard.id, shard);

		this.emit('shardCreate', shard);
		return shard;
	}

	/**
	 * Kills all running shards and respawns them.
	 * @param options The options for respawning shards.
	 */
	public async respawnAll(options: ShardingManagerRespawnAllOptions) {
		const resolved = shardingManagerRespawnAllOptions.parse(options);

		let s = 0;
		for (const shard of this.shards.values()) {
			await Promise.all([
				shard.respawn({ delay: resolved.respawnDelay, timeout: resolved.timeout }),
				++s < this.shards.size && resolved.shardDelay > 0 ? sleep(resolved.shardDelay) : Promise.resolve(),
			]);
		}
	}

	/**
	 * Sends a message to all shards.
	 * @param data The data to be sent to the shards.
	 * @param options The options to be passed to each {@link IShardHandler.send}.
	 * @returns An array of the resolved values from {@link IShardHandler.send}.
	 */
	public broadcast(data: unknown, options: ShardHandlerSendOptions): Promise<unknown[]> {
		const promises = [];
		for (const shard of this.shards.values()) promises.push(shard.send(data, options));
		return Promise.all(promises);
	}
}

export interface ShardingManagerOptions<ShardOptions extends NonNullObject> {
	/**
	 * Number of total shards of all shard managers or "auto".
	 * @default 'auto'
	 */
	totalShards?: number | 'auto';

	/**
	 * List of shards to spawn or "auto".
	 * @default 'auto'
	 */
	shardList?: [number, ...number[]] | 'auto';

	/**
	 * Whether or not shards should automatically respawn upon exiting.
	 * @default true
	 */
	respawn?: boolean;

	/**
	 * The {@link IShardHandler} builder.
	 * @default ProcessShardHandler
	 */
	shardHandlerBuilder?: IShardHandlerConstructor<ShardOptions>;

	/**
	 * The shard options.
	 * @default {}
	 */
	shardOptions?: ShardOptions;

	/**
	 * The {@link IMessageHandler} builder.
	 * @default JsonMessageHandler
	 */
	messageHandlerBuilder?: IMessageHandlerConstructor;

	/**
	 * Token to use for automatic shard count and passing to shards.
	 * @default process.env.DISCORD_TOKEN
	 */
	token?: string;
}

export interface ShardingManagerSpawnOptions {
	/**
	 * Number of shards to spawn.
	 * @default this.totalShards
	 */
	amount?: number | 'auto';

	/**
	 * How long to wait in between spawning each shard, in milliseconds.
	 * @default 5500
	 */
	delay?: number;

	/**
	 * The amount in milliseconds to wait until the shard has become ready.
	 * @default 30000
	 */
	timeout?: number;
}

export interface ShardingManagerRespawnAllOptions {
	/**
	 * How long to wait between shards, in milliseconds.
	 * @default 5000
	 */
	shardDelay?: number;

	/**
	 * How long to wait between killing a shard's process and restarting it, in milliseconds.
	 * @default 500
	 */
	respawnDelay?: number;

	/**
	 * The amount in milliseconds to wait for a shard to become ready before, continuing to another (`-1` or `Infinity` for no wait).
	 * @default 30000
	 */
	timeout?: number;
}
