import { ChildProcess, fork } from 'node:child_process';
import { z } from 'zod';
import { pathToFilePredicate } from '../utils/utils';
import { BaseProcessShardHandler, BaseProcessShardHandlerOptions } from './BaseProcessShardHandler';

const forkProcessShardHandlerOptionsPredicate = z.strictObject({
	shardArgs: z.string().array().default([]),
	execArgv: z.string().array().default([]),
	path: pathToFilePredicate,
});

export class ForkProcessShardHandler extends BaseProcessShardHandler<ChildProcess, ForkProcessShardHandlerOptions> {
	protected createProcess(): ChildProcess {
		return fork(this.manager.options.path, this.manager.options.shardArgs, {
			env: this.env,
			execArgv: this.manager.options.execArgv,
		});
	}

	public static override validate(value: unknown): Required<ForkProcessShardHandlerOptions> {
		return forkProcessShardHandlerOptionsPredicate.parse(value);
	}
}

export interface ForkProcessShardHandlerOptions extends BaseProcessShardHandlerOptions {
	/**
	 * The path of the file to fork.
	 */
	path: string;
}
