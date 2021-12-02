import { ChildProcess, fork } from 'node:child_process';
import { once } from 'node:events';
import { z } from 'zod';
import { IMessageHandlerConstructor, MessageOp } from '../messages/IMessageHandler';
import type { ShardingManager, ShardingManagerRespawnAllOptions } from '../ShardingManager';
import { createDeferredPromise } from '../utils/utils';
import { BaseShardHandler } from './BaseShardHandler';
import type { ShardHandlerStartOptions } from './IShardHandler';

const processShardHandlerOptionsPredicate = z.strictObject({
	shardArgs: z.string().array().default([]),
	execArgv: z.string().array().default([]),
});

export class ProcessShardHandler extends BaseShardHandler<ProcessShardHandlerOptions> {
	/**
	 * Environment variables for the shard's process.
	 */
	public readonly env: Record<string, string>;

	/**
	 * Whether or not the shard's client is ready.
	 */
	public ready = false;

	public process: ChildProcess | null = null;

	private _exitListener: ((options: HandleExitOptions) => void) | null = null;

	public constructor(
		id: number,
		manager: ShardingManager<ProcessShardHandlerOptions>,
		messageBuilder: IMessageHandlerConstructor,
	) {
		super(id, manager, messageBuilder);

		this.env = {
			...process.env,
			SHARDING_MANAGER: 'true',
			SHARDS: this.id.toString(),
			SHARD_COUNT: this.manager.totalShards.toString(),
		};

		if (this.manager.token) this.env.DISCORD_TOKEN = this.manager.token;
	}

	public async start({ timeout = 30_000 }: ShardHandlerStartOptions = {}): Promise<void> {
		if (this.process !== null) throw new Error('The process was already started.');

		this._exitListener = this._handleExit.bind(this);

		this.process = fork(this.manager.path, this.manager.shardOptions.shardArgs, {
			env: this.env,
			execArgv: this.manager.shardOptions.execArgv,
		});

		this.process.on('message', this._handleMessage.bind(this));
		this.process.on('exit', this._exitListener);

		if (timeout === -1 || timeout === Infinity) {
			this.manager.emit('shardSpawn', this);
			this.emit('spawn');
			return;
		}

		const abortController = new AbortController();
		const timer = setTimeout(() => abortController.abort(), timeout);

		try {
			await once(this.process, 'spawn', { signal: abortController.signal });
			await once(this, 'ready', { signal: abortController.signal });
		} finally {
			clearTimeout(timer);
		}

		this.manager.emit('shardSpawn', this);
		this.emit('spawn');
	}

	public async close(): Promise<void> {
		if (this.process === null) throw new Error('The process was already closed.');

		this.process.off('exit', this._exitListener!);
		this.process.kill();

		await this._handleExit({ respawn: false });
	}

	protected sendMessage(data: string | Buffer): Promise<void> {
		if (this.process === null) return Promise.reject(new Error('The process was not initialized.'));

		const deferred = createDeferredPromise<void>();
		this.process.send(data, (error) => {
			if (error) deferred.reject(error);
			else deferred.resolve();
		});

		return deferred.promise;
	}

	public static validate(value: unknown): Required<ProcessShardHandlerOptions> {
		return processShardHandlerOptionsPredicate.parse(value);
	}

	private _handleMessage(message: string) {
		const deserialized = this.messages.deserialize(message);

		switch (deserialized.op) {
			case MessageOp.Ready: {
				this.ready = true;
				this.manager.emit('shardReady', this);
				this.emit('ready');
				break;
			}
			case MessageOp.Disconnected: {
				this.ready = false;
				this.manager.emit('shardDisconnected', this);
				this.emit('disconnected');
				break;
			}
			case MessageOp.Reconnecting: {
				this.ready = false;
				this.manager.emit('shardReconnecting', this);
				this.emit('reconnecting');
				break;
			}
			case MessageOp.RespawnAll: {
				this.manager
					.respawnAll(deserialized.data as ShardingManagerRespawnAllOptions)
					.catch((error) => this.send({ success: false, error }, { id: deserialized.id, reply: false }))
					.catch(() => void 0);
				break;
			}
			case MessageOp.Message: {
				this.messages.handle(deserialized.id, deserialized.data);
				this.manager.emit('shardMessage', this);
				this.emit('message');
				break;
			}
		}
	}

	private async _handleExit(options: HandleExitOptions) {
		this.manager.emit('shardDeath', this);
		this.emit('death');

		this.ready = false;
		this.process = null;

		if (options.respawn ?? this.manager.respawn) await this.start({ timeout: options.timeout });
	}
}

export interface ProcessShardHandlerOptions {
	/**
	 * Arguments to pass to the shard script when spawning.
	 */
	shardArgs?: string[];

	/**
	 * Arguments to pass to the shard script executable when spawning.
	 */
	execArgv?: string[];
}

interface HandleExitOptions {
	/**
	 * Whether or not to spawn the shard again.
	 */
	respawn?: boolean;

	/**
	 * The amount in milliseconds to wait until the client has become ready (`-1` or `Infinity` for no wait).
	 */
	timeout?: number;
}
