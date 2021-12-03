import cluster, { Worker } from 'node:cluster';
import { BaseProcessShardHandler, BaseProcessShardHandlerOptions } from './BaseProcessShardHandler';

export class ClusterProcessShardHandler extends BaseProcessShardHandler<Worker> {
	protected override createProcess(): Worker {
		return cluster.fork(this.env);
	}

	public static override setup(options: BaseProcessShardHandlerOptions) {
		cluster.setupPrimary({ execArgv: options.execArgv, args: options.shardArgs });
	}

	public static override get isPrimary() {
		return cluster.isPrimary;
	}
}
