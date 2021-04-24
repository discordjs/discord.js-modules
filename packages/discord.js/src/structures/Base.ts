import { Client } from './client/Client';

export class Base {
	public constructor(public readonly client: Client) {
		this.client = client;
	}
}
