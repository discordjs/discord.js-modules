import { EventEmitter } from 'events';
import { ClientOptions } from '../typedefs/ClientOptions';
export class BaseClient extends EventEmitter {
	public constructor(options: ClientOptions) {
		super();
		this._timeouts = new Set();
		this._intervals = new Set();
		this._immediates = new Set();
		this.options = options;
	}

	private readonly _timeouts: Set<NodeJS.Timeout>;
	private readonly _intervals: Set<NodeJS.Timeout>;
	private readonly _immediates: Set<NodeJS.Immediate>;
	public readonly options: ClientOptions;
	public destroy(): void {
		for (const t of this._timeouts) this.clearTimeout(t);
		for (const i of this._intervals) this.clearInterval(i);
		for (const x of this._immediates) this.clearImmediate(x);
		this._timeouts.clear();
		this._intervals.clear();
		this._immediates.clear();
	}

	public clearTimeout(timeout: NodeJS.Timeout) {
		this.clearTimeout(timeout);
		this._timeouts.delete(timeout);
	}

	public clearInterval(interval: NodeJS.Timeout) {
		this.clearInterval(interval);
		this._intervals.delete(interval);
	}

	public clearImmediate(immediate: NodeJS.Immediate) {
		this.clearImmediate(immediate);
		this._immediates.delete(immediate);
	}

	public setTimeout(fn: any, delay: number, ...args: unknown[]): NodeJS.Timeout {
		const timeout = setTimeout(() => {
			fn(...args);
			this._timeouts.delete(timeout);
		}, delay);
		this._timeouts.add(timeout);
		return timeout;
	}

	public setInterval(fn: any, delay: number, ...args: unknown[]): NodeJS.Timeout {
		const interval = this.setInterval(fn, delay, ...args);
		this._intervals.add(interval);
		return interval;
	}

	public setImmediate(fn: () => any, ...args: unknown[]): NodeJS.Immediate {
		const immediate = this.setImmediate(fn, ...args);
		this._immediates.add(immediate);
		return immediate;
	}
}
