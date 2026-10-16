import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {
	ListToolsRequestSchema,
	CallToolRequestSchema,
	ListResourcesRequestSchema,
	ReadResourceRequestSchema,
	ListPromptsRequestSchema,
	GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Env } from './types';
import { getSkill, listResources } from './skills';
import { listPrompts, getPromptContent, PROMPTS } from './prompts';
import { auditPage } from './audit';

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

	server.setRequestHandler(ListResourcesRequestSchema, async () => ({
		resources: listResources(),
	}));

	server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
		const { uri } = request.params;
		const content = await getSkill(uri, env);
		
		return {
			contents: [
				{
					uri,
					mimeType: 'text/markdown',
					text: content,
				},
			],
		};
	});

	server.setRequestHandler(ListPromptsRequestSchema, async () => ({
		prompts: listPrompts(),
	}));

	server.setRequestHandler(GetPromptRequestSchema, async (request) => {
		const { name } = request.params;
		const prompt = PROMPTS.find((p) => p.name === name);
		
		if (!prompt) {
			throw new Error(`Unknown prompt: ${name}`);
		}

		const skillName = name === 'connect-webflow' ? 'wf-mcp-setup' : name.replace('audit-site', 'wf-audit').replace('extract-design-system', 'wf-design-system').replace('plan-page', 'wf-plan').replace('prototype-section', 'wf-prototype').replace('build-section', 'wf-build');
		
		const skillUri = `skill://${skillName}/SKILL.md`;
		const skillContent = await getSkill(skillUri, env);
		const content = getPromptContent(name, skillContent);

		return {
			description: prompt.description,
			messages: [
				{
					role: 'user',
					content: {
						type: 'text',
						text: content,
					},
				},
			],
		};
	});

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
			{
				name: 'audit_page',
				description: 'Audit a web page for SEO, accessibility, performance, and best practices',
				inputSchema: {
					type: 'object',
					properties: {
						url: {
							type: 'string',
							description: 'The URL of the page to audit',
						},
					},
					required: ['url'],
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
		
		if (request.params.name === 'audit_page') {
			const args = request.params.arguments as { url: string };
			const result = await auditPage(args.url, env);
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(result, null, 2),
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
