import type { IMessageHandlerConstructor, MessageOp } from '../messages/IMessageHandler';
import type { ShardingManager } from '../ShardingManager';
import type { NonNullObject } from '../utils/types';

/**
 * The shard handler is a strategy system that manages the lifetime and a channel to the client shard, this class is
 * used exclusively in the primary process alongside {@link ShardingManager}, and can be passed in
 * {@link ShardingManagerOptions.ShardHandler}.
 *
 * To create your own strategy, the easiest way is to create a class extending any of the following bases:
 *
 * - {@link BaseShardHandler}: defines the bare-basic implementation.
 * - {@link BaseProcessShardHandler}: defines an almost-full implementation, works with {@link ChildProcess} and
 * {@link Worker}.
 *
 * Furthermore, the library ships the following built-in handlers:
 *
 * - {@link ForkProcessShardHandler}: defines a process-based sharding using `child_process.fork`.
 * - {@link ClusterProcessShardHandler}: defines a process-based sharding using `cluster.fork`.
 */
export interface IShardHandler<ShardOptions = NonNullObject> {
	/**
	 * The shard IDs.
	 */
	readonly ids: readonly number[];

	/**
	 * The manager that instantiated the shard handler.
	 */
	readonly manager: ShardingManager<ShardOptions>;

	/**
	 * Sends data to the shard.
	 * @param data The data to be sent.
	 * @param options The options for the message delivery.
	 */
	send(data: unknown, options?: ShardHandlerSendOptions): Promise<unknown>;

	/**
	 * Starts the shard.
	 * @param options The options defining the start-up behavior.
	 */
	start(options: ShardHandlerStartOptions): Promise<void> | void;

	/**
	 * Closes the shard and terminates the communication with the client.
	 */
	close(): Promise<void> | void;

	/**
	 * Restarts the shard handler, may call {@link start} and then {@link close}.
	 * @param options The options defining the respawn behavior.
	 */
	restart(options: ShardHandlerRestartOptions): Promise<void>;
}

export interface ShardHandlerSendOptions {
	id?: number;
	reply?: boolean;
	opcode?: MessageOp;
}

export interface ShardHandlerStartOptions {
	timeout?: number | undefined;
}

export interface ShardHandlerRestartOptions {
	delay: number;
	timeout: number;
}

export interface IShardHandlerConstructor<ResolvedOptions extends NonNullObject = NonNullObject> {
	new (
		ids: readonly number[],
		manager: ShardingManager<ResolvedOptions>,
		messageBuilder: IMessageHandlerConstructor,
	): IShardHandler<ResolvedOptions>;

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
