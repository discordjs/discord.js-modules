import type { Response } from 'node-fetch';

/**
 * Converts the response to usable data
 * @param res The node-fetch response
 */
export function parseResponse(res: Response): Promise<unknown> {
	if (res.headers.get('Content-Type')?.startsWith('application/json')) return res.json();
	return res.buffer();
}
