import { describe, it, expect } from 'vitest';
import { buildServer } from '../src/server';

describe('Phase 0: Scaffold', () => {
	it('should create a server with ping tool', async () => {
		const env = {  CRUX_API_KEY: undefined };
		const server = buildServer(env);
		
		expect(server).toBeDefined();
	});
	
	it('should list tools', async () => {
		const env = {  CRUX_API_KEY: undefined };
		const server = buildServer(env);
		
		const result = await server['_requestHandlers'].get(
			'tools/list' as any
		)?.(
			{ method: 'tools/list', params: {} } as any,
			{} as any
		);
		
		expect(result).toBeDefined();
		expect((result as any).tools.length).toBe(6);
		const toolNames = (result as any).tools.map((t: any) => t.name);
		expect(toolNames).toContain('audit_page');
		expect(toolNames).toContain('scorecard_26');
	});
});
