import type { IMessageHandlerConstructor } from '../messages/IMessageHandler';
import type { ShardingManager } from '../ShardingManager';
import type { NonNullObject } from '../utils/types';

export interface IShardHandler {
	readonly id: number;
	readonly manager: ShardingManager;

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
	spawn(
		id: number,
		manager: ShardingManager<ResolvedOptions>,
		messageBuilder: IMessageHandlerConstructor,
	): Promise<IShardHandler>;
	validate(value: unknown): ResolvedOptions;
}
