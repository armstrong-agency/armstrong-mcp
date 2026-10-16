import { describe, it, expect } from 'vitest';
import { buildServer } from '../src/server';

describe('Phase 0: Scaffold', () => {
	it('should create a server with ping tool', async () => {
		const env = { RATE_LIMITER: null, CRUX_API_KEY: undefined };
		const server = buildServer(env);
		
		expect(server).toBeDefined();
	});
	
	it('should list ping tool', async () => {
		const env = { RATE_LIMITER: null, CRUX_API_KEY: undefined };
		const server = buildServer(env);
		
		const result = await server['_requestHandlers'].get(
			'tools/list' as any
		)?.(
			{ method: 'tools/list', params: {} } as any,
			{} as any
		);
		
		expect(result).toBeDefined();
		expect((result as any).tools.length).toBeGreaterThanOrEqual(1);
		const pingTool = (result as any).tools.find((t: any) => t.name === 'ping');
		expect(pingTool).toBeDefined();
		expect(pingTool.name).toBe('ping');
	});
});
