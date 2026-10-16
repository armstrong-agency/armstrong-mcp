import { buildServer, handleMcpRequest } from './server';
import { checkRateLimit } from './rate-limit';
import type { Env } from './types';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		
		if (url.pathname !== '/mcp' && url.pathname !== '/mcp/') {
			return new Response('Armstrong MCP Server - Use /mcp endpoint', {
				status: 404,
				headers: { 'Content-Type': 'text/plain' },
			});
		}

		const rateLimitInfo = await checkRateLimit(request, env, 'tools');
		if (!rateLimitInfo.allowed) {
			return new Response(
				JSON.stringify({
					error: 'Rate limit exceeded',
					retryAfter: rateLimitInfo.retryAfter,
				}),
				{
					status: 429,
					headers: {
						'Content-Type': 'application/json',
						'Retry-After': rateLimitInfo.retryAfter?.toString() || '60',
					},
				}
			);
		}

		const server = buildServer(env);
		return handleMcpRequest(server, request);
	},
} satisfies ExportedHandler<Env>;
