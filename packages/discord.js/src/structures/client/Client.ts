/* eslint no-eval: 0 */

import { ClientOptions } from '../../typedefs/ClientOptions';
import { BaseClient } from './BaseClient';

interface CloseEvent {
	wasClean: boolean;
	code: number;
	reason: string;
	// target: WebSocket;
}

interface ClientEvents {
	ready: () => void;
	shardDisconnect: (event: CloseEvent, shardID: number) => void;
	shardError: (error: Error, shardID: number) => void;
	shardReady: (shardID: number, unavailableGuilds: Set<string> | undefined) => void;
	shardReconnecting: (shardID: number) => void;
	shardResume: (shardID: number, replayedEvents: number) => void;
}

export declare interface Client {
	on<K extends keyof ClientEvents>(event: K, listener: ClientEvents[K]): this;
	once<S extends keyof ClientEvents>(event: S, listener: ClientEvents[S]): this;
	off<T extends keyof ClientEvents>(event: T, listener: ClientEvents[T]): this;
	emit<X extends keyof ClientEvents>(event: X, args: ClientEvents[X]): boolean;
	removeAllListeners<Z extends keyof ClientEvents>(event: Z): this;
	login(token: string): Promise<void>;
}

export class Client extends BaseClient {
	public constructor(options?: ClientOptions) {
		super();
		this.options = options;
	}
	private _eval(script: any): any {
		/* eslint-disable no-alert, no-console */
		return eval(script);
	}
	public readyAt: Date | null = null;
	public get readyTimestamp(): number | null {
		return this.readyAt ? this.readyAt.getTime() : null;
	}
	public get uptime(): number | null {
		return this.readyAt ? Date.now() - this.readyAt.getTime() : null;
	}
}
