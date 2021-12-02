import { BaseMessageHandler } from './BaseMessageHandler';
import { DeserializedData, MessageOp, SerializedData } from './IMessageHandler';

export class JsonMessageHandler extends BaseMessageHandler<string> {
	private lastId = 0;

	public serialize(data: unknown, op: MessageOp = MessageOp.Message, id?: number): SerializedData<string> {
		id ??= this.lastId++;
		return { id, op, data: JSON.stringify({ id, data }) };
	}

	public deserialize(data: string): DeserializedData {
		return JSON.parse(data);
	}
}
