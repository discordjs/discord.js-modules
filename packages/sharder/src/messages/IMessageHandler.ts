export interface IMessageHandler<SerializedType = string | Buffer> {
	serialize(data: unknown, op?: MessageOp, id?: number): SerializedData<SerializedType>;
	deserialize(data: SerializedType): DeserializedData;

	handle(id: number, data: unknown): void;

	track(id: number): void;
	untrack(id: number): void;
	clear(): void;

	waitForId(id: number): Promise<unknown>;
}

export const enum MessageOp {
	Ready,
	Disconnected,
	Reconnecting,
	RespawnAll,
	Message,
}

export interface SerializedData<SerializedType = string | Buffer> {
	id: number;
	op: MessageOp;
	data: SerializedType;
}

export interface DeserializedData {
	id: number;
	op: MessageOp;
	data: unknown;
}

export type IMessageHandlerConstructor<SerializedType = string | Buffer> = new () => IMessageHandler<SerializedType>;

// export interface IMessageHandlerConstructor<SerializedType = string | Buffer> {
// 	build(): IMessageHandler<SerializedType>;
// }
