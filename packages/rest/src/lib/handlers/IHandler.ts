import type { RequestInit } from 'node-fetch';
import type { RouteData } from '../RequestManager';

export interface IHandler {
	queueRequest(routeID: RouteData, url: string, options: RequestInit): Promise<unknown>;
}
