interface ActivityOptions {
	name?: string;
	url?: string;
	type?: ActivityType | number;
	shardID?: number | readonly number[];
}
type ActivityType = 'PLAYING' | 'STREAMING' | 'LISTENING' | 'WATCHING' | 'CUSTOM_STATUS' | 'COMPETING';
type ClientPresenceStatus = 'online' | 'idle' | 'dnd';
type PresenceStatusData = ClientPresenceStatus | 'invisible';

export interface PresenceData {
	status?: PresenceStatusData;
	afk?: boolean;
	activities?: ActivityOptions[];
	shardID?: number | number[];
}
