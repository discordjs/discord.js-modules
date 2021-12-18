import { BaseMessageHandler } from './BaseMessageHandler';
import { DeserializedData, MessageOp, SerializedData } from './IMessageHandler';
import { serialize, deserialize } from 'node:v8';

export class JsonMessageHandler extends BaseMessageHandler<Buffer> {
	public serialize(data: unknown, op: MessageOp = MessageOp.Message, id?: number): SerializedData<Buffer> {
		id ??= this.nextId;
		return { id, body: serialize({ id, op, data }) };
	}

	public deserialize(data: Buffer): DeserializedData {
		return deserialize(data);
	}
}
