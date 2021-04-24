import EventEmitter from 'events';
import { ClientOptions } from '../../typedefs/ClientOptions';
export class BaseClient extends EventEmitter {
	public constructor(options?: ClientOptions) {
		super();
		this.options = options;
	}
	// private readonly api
	// private rest

	private readonly _timeouts = new Set<NodeJS.Timeout>();
	private readonly _intervals = new Set<NodeJS.Timeout>();
	private readonly _immediates = new Set<NodeJS.Immediate>();
	public options: ClientOptions | undefined;
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

	public setTimeout(fn: (...args: unknown[]) => void, delay: number, ...args: unknown[]): NodeJS.Timeout {
		const timeout = setTimeout(() => {
			fn(...args);
			this._timeouts.delete(timeout);
		}, delay);
		this._timeouts.add(timeout);
		return timeout;
	}

	public setInterval(fn: (...args: unknown[]) => void, delay: number, ...args: unknown[]): NodeJS.Timeout {
		const interval = this.setInterval(fn, delay, ...args);
		this._intervals.add(interval);
		return interval;
	}

	public setImmediate(fn: (...args: unknown[]) => void, ...args: unknown[]): NodeJS.Immediate {
		const immediate = this.setImmediate(fn, ...args);
		this._immediates.add(immediate);
		return immediate;
	}

	private incrementMaxListeners(): void {
		const maxListeners = this.getMaxListeners();
		if (maxListeners !== 0) {
			this.setMaxListeners(maxListeners + 1);
		}
	}

	private decrementMaxListener(): void {
		const maxListeners = this.getMaxListeners();
		if (maxListeners !== 0) {
			this.setMaxListeners(maxListeners - 1);
		}
	}
}
