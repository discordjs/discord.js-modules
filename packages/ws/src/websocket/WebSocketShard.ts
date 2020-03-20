import { EventEmitter } from 'events';
import { WebSocketManager } from './WebSocketManager';

export class WebSocketShard extends EventEmitter {
	public constructor(public readonly manager: WebSocketManager, public readonly id: string) {
		super();
	}
}
