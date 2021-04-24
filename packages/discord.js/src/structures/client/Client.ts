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
	shardError: [error: Error, shardID: number];
	shardReady: [shardID: number, unavailableGuilds: Set<string> | undefined];
	shardReconnecting: [shardID: number];
	shardResume: [shardID: number, replayedEvents: number];
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
}
