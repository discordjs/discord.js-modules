import type { IMessageHandlerConstructor } from '../messages/IMessageHandler';
import type { ShardingManager } from '../ShardingManager';
import type { NonNullObject } from '../utils/types';

export interface IShardHandler<ShardOptions = NonNullObject> {
	readonly id: number;
	readonly manager: ShardingManager<ShardOptions>;

	send(data: unknown, options?: ShardHandlerSendOptions): Promise<unknown>;

	start(options: ShardHandlerStartOptions): Promise<void> | void;
	close(): Promise<void> | void;

	respawn(options: ShardHandlerRespawnOptions): Promise<void>;
}

export interface ShardHandlerSendOptions {
	id?: number;
	reply?: boolean;
}

export interface ShardHandlerStartOptions {
	timeout?: number | undefined;
}

export interface ShardHandlerRespawnOptions {
	delay: number;
	timeout: number;
}

export interface IShardHandlerConstructor<ResolvedOptions extends NonNullObject = NonNullObject> {
	new (
		id: number,
		manager: ShardingManager<ResolvedOptions>,
		messageBuilder: IMessageHandlerConstructor,
	): IShardHandler;

	/**
	 * Sets up the shard handler for subsequent runs.
	 * @param options The options passed in {@link ShardingManagerOptions.shardOptions}.
	 */
	setup(options: ResolvedOptions): void;

	/**
	 * Validates the shard options.
	 * @param value The options passed in {@link ShardingManagerOptions.shardOptions}.
	 * @returns The validated values with the defined values.
	 */
	validate(value: unknown): ResolvedOptions;

	/**
	 * Whether or not the process is a primary one.
	 */
	readonly isPrimary: boolean;
}
