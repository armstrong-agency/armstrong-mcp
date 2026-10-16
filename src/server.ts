import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Env } from './types';

export function buildServer(env: Env): Server {
	const server = new Server(
		{
			name: 'armstrong-mcp',
			version: '1.0.0',
		},
		{
			capabilities: {
				tools: {},
				resources: {},
				prompts: {},
			},
		}
	);

	server.setRequestHandler(ListToolsRequestSchema, async () => ({
		tools: [
			{
				name: 'ping',
				description: 'Test tool that responds with pong',
				inputSchema: {
					type: 'object',
					properties: {
						message: {
							type: 'string',
							description: 'Optional message to echo back',
						},
					},
				},
			},
		],
	}));

	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		if (request.params.name === 'ping') {
			const args = request.params.arguments as { message?: string };
			return {
				content: [
					{
						type: 'text',
						text: args?.message ? `pong: ${args.message}` : 'pong',
					},
				],
			};
		}
		throw new Error(`Unknown tool: ${request.params.name}`);
	});

	return server;
}

export async function handleMcpRequest(server: Server, request: Request): Promise<Response> {
	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: undefined,
	});
	
	await server.connect(transport);
	return transport.handleRequest(request);
}
