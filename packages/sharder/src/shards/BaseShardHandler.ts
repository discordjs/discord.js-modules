import { EventEmitter } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import { IMessageHandler, IMessageHandlerConstructor, MessageOp } from '../messages/IMessageHandler';
import type { ShardingManager } from '../ShardingManager';
import type { NonNullObject } from '../utils/types';
import type {
	IShardHandler,
	ShardHandlerRespawnOptions,
	ShardHandlerSendOptions,
	ShardHandlerStartOptions,
} from './IShardHandler';

export abstract class BaseShardHandler<ShardOptions = NonNullObject> extends EventEmitter implements IShardHandler {
	public readonly id: number;
	public readonly manager: ShardingManager<ShardOptions>;
	protected readonly messages: IMessageHandler;

	public constructor(id: number, manager: ShardingManager<ShardOptions>, messageBuilder: IMessageHandlerConstructor) {
		super();
		this.id = id;
		this.manager = manager;
		this.messages = messageBuilder.build();
	}

	public async send(data: unknown, options: ShardHandlerSendOptions = {}): Promise<unknown> {
		const serialized = this.messages.serialize(data, MessageOp.Message);
		const reply = options.reply ?? true;

		if (reply) this.messages.track(serialized.id);

		try {
			await this.sendMessage(serialized.data);
		} catch (error) {
			this.messages.untrack(serialized.id);
			throw error;
		}

		return reply ? this.messages.waitForId(serialized.id) : null;
	}

	/**
	 * Closes and restarts the shard.
	 * @param options The options for respawning the shard.
	 */
	public async respawn(options: ShardHandlerRespawnOptions): Promise<void> {
		await this.close();
		if (options.delay > 0) await sleep(options.delay);
		await this.start(options);
	}

	public abstract start(options: ShardHandlerStartOptions): Promise<void> | void;

	/**
	 * Closes the shard and does not restart it.
	 */
	public abstract close(): Promise<void> | void;

	protected abstract sendMessage(data: unknown): Promise<void>;

	public static async spawn(
		id: number,
		manager: ShardingManager,
		messageBuilder: IMessageHandlerConstructor,
	): Promise<IShardHandler> {
		const instance = Reflect.construct(this, [id, manager, messageBuilder]) as IShardHandler;
		await instance.start({ timeout: 0 });
		return instance;
	}
}
