import { REST } from '@discordjs/rest';
import { EventEmitter } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import { z } from 'zod';
import type { IMessageHandlerConstructor } from './messages/IMessageHandler';
import { JsonMessageHandler } from './messages/JsonMessageHandler';
import { ForkProcessShardHandler } from './shards/ForkProcessShardHandler';
import type { IShardHandler, IShardHandlerConstructor, ShardHandlerSendOptions } from './shards/IShardHandler';
import type { NonNullObject } from './utils/types';
import {
	fetchRecommendedShards,
	FetchRecommendedShardsOptions,
	fetchRecommendedShardsOptionsPredicate,
} from './utils/utils';

const shardingManagerOptionsPredicate = z.strictObject({
	shardList: z.literal('auto').or(z.array(z.number().positive().int()).nonempty()).default('auto'),
	totalShards: z.literal('auto').or(z.number().int().gte(1)).default('auto'),
	token: z.string().nonempty().nullish().default(null),
	rest: z.instanceof(REST).optional(),
	respawns: z.number().int().positive().or(z.literal(-1)).or(z.literal(Infinity)).default(-1),
	shardOptions: z.object({}).default({}),
	ShardHandler: z.object({ spawn: z.function(), validate: z.function(), isPrimary: z.boolean() }).optional(),
	MessageHandler: z.object({ build: z.function() }).optional(),
});

const shardingManagerSpawnOptions = z
	.strictObject({
		amount: z.literal('auto').or(z.number().int().gte(1)).optional(),
		delay: z.number().int().positive().default(5500),
		timeout: z.number().int().positive().default(30_000),
	})
	.and(fetchRecommendedShardsOptionsPredicate);

const shardingManagerRespawnAllOptions = z.strictObject({
	shardDelay: z.number().int().positive().default(5000),
	respawnDelay: z.number().int().positive().default(500),
	timeout: z.number().int().positive().or(z.literal(-1)).or(z.literal(Infinity)).default(30000),
});

export class ShardingManager<ShardOptions extends NonNullObject = NonNullObject> extends EventEmitter {
	/**
	 * Number of total shards of all shard managers or "auto".
	 */
	public shardList: [number, ...number[]] | 'auto';

	/**
	 * List of shards to spawn or "auto".
	 */
	public totalShards: number | 'auto';

	/**
	 * Whether or not the shards should respawn.
	 */
	public readonly respawns: number;

	public readonly rest: REST;

	public readonly options: ShardOptions;
	public readonly ShardHandler: IShardHandlerConstructor<ShardOptions>;

	public readonly MessageHandler: IMessageHandlerConstructor;

	/**
	 * Token to use for automatic shard count and passing to shards.
	 */
	public readonly token: string | null;

	public readonly shards = new Map<number, IShardHandler>();

	public constructor(options: ShardingManagerOptions<ShardOptions> = {}) {
		super();

		const resolved = shardingManagerOptionsPredicate.parse(options);
		this.shardList = resolved.shardList;
		this.totalShards = resolved.totalShards;
		this.respawns = resolved.respawns;
		this.token = resolved.token?.replace(/^Bot\s*/i, '') ?? null;
		this.rest = resolved.rest ?? new REST().setToken(this.token!);

		this.ShardHandler = options.ShardHandler ?? (ForkProcessShardHandler as any);
		this.options = this.ShardHandler.validate(options.shardOptions);
		this.ShardHandler.setup(this.options);

		this.MessageHandler = options.MessageHandler ?? JsonMessageHandler;
	}

	/**
	 * Spawns all shards given the options and that the process is not primary.
	 * @param options The spawn options.
	 * @returns Whether or not the spawn has happened. Will always be the opposite of {@link IShardHandlerConstructor.isPrimary}.
	 */
	public async spawn(options: ShardingManagerSpawnOptions): Promise<boolean> {
		if (this.ShardHandler.isPrimary) return false;

		const resolved = shardingManagerSpawnOptions.parse(options);
		let amount = resolved.amount ?? this.totalShards;

		if (amount === 'auto') {
			amount = await fetchRecommendedShards(this.rest, resolved);
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

		return true;
	}

	public async spawnShard(shardId: number) {
		const shard = new this.ShardHandler(shardId, this, this.MessageHandler);
		await shard.start({ timeout: 0 });

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
	 * The amount of times to respawn shards (`-1` or `Infinity` for no limitless)
	 * @default -1
	 */
	respawns?: number;

	/**
	 * The {@link IShardHandler} builder.
	 * @default ProcessShardHandler
	 */
	ShardHandler?: IShardHandlerConstructor<ShardOptions>;

	/**
	 * The shard options.
	 * @default {}
	 */
	shardOptions?: ShardOptions;

	/**
	 * The {@link IMessageHandler} builder.
	 * @default JsonMessageHandler
	 */
	MessageHandler?: IMessageHandlerConstructor;

	/**
	 * Token to use for automatic shard count and passing to shards.
	 * @default process.env.DISCORD_TOKEN
	 */
	token?: string;
}

export interface ShardingManagerSpawnOptions extends FetchRecommendedShardsOptions {
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
