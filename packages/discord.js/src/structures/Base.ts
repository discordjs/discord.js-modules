import { Client } from './client/Client';

export class Base {
	public readonly client: Client;
	public constructor(client: Client) {
		this.client = client;
	}
}
