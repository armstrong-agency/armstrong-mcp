export type SkillName =
	| 'wf-audit'
	| 'wf-build'
	| 'wf-design-system'
	| 'wf-mcp-setup'
	| 'wf-plan'
	| 'wf-prototype'
	| 'wf-reference';

export type ResourcePath =
	| `skill://wf-${SkillName}/SKILL.md`
	| 'skill://wf-reference/client-first.md'
	| 'skill://wf-reference/mast.md'
	| 'skill://wf-reference/common-issues.md'
	| 'skill://wf-build/agent-runs.md'
	| 'skill://wf-mcp-setup/codex.md'
	| 'skill://wf-mcp-setup/cursor-local.md'
	| 'skill://wf-mcp-setup/cursor-cloud.md';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/armstrong-agency/skills/main';
const CACHE_TTL_SECONDS = 3600;

const RESOURCE_PATHS: Record<string, string> = {
	'skill://wf-audit/SKILL.md': '/wf-audit/SKILL.md',
	'skill://wf-build/SKILL.md': '/wf-build/SKILL.md',
	'skill://wf-design-system/SKILL.md': '/wf-design-system/SKILL.md',
	'skill://wf-mcp-setup/SKILL.md': '/wf-mcp-setup/SKILL.md',
	'skill://wf-plan/SKILL.md': '/wf-plan/SKILL.md',
	'skill://wf-prototype/SKILL.md': '/wf-prototype/SKILL.md',
	'skill://wf-reference/SKILL.md': '/wf-reference/SKILL.md',
	'skill://wf-reference/client-first.md': '/wf-reference/client-first.md',
	'skill://wf-reference/mast.md': '/wf-reference/mast.md',
	'skill://wf-reference/common-issues.md': '/wf-reference/common-issues.md',
	'skill://wf-build/agent-runs.md': '/wf-build/agent-runs.md',
	'skill://wf-mcp-setup/codex.md': '/wf-mcp-setup/codex.md',
	'skill://wf-mcp-setup/cursor-local.md': '/wf-mcp-setup/cursor-local.md',
	'skill://wf-mcp-setup/cursor-cloud.md': '/wf-mcp-setup/cursor-cloud.md',
};

export async function getSkill(uri: string, env: Env): Promise<string> {
	const githubPath = RESOURCE_PATHS[uri];
	if (!githubPath) {
		throw new Error(`Unknown resource: ${uri}`);
	}

	const cacheKey = new Request(`https://cache.armstrong.internal${uri}`);
	const cache = caches.default;

	let response = await cache.match(cacheKey);

	if (!response) {
		const githubUrl = `${GITHUB_RAW_BASE}${githubPath}`;
		
		try {
			response = await fetch(githubUrl, {
				headers: {
					'User-Agent': 'ArmstrongMCP/1.0',
				},
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch from GitHub: ${response.status}`);
			}

			const headers = new Headers(response.headers);
			headers.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}`);
			
			response = new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers,
			});

			await cache.put(cacheKey, response.clone());
		} catch (error) {
			console.warn(`Failed to fetch ${uri} from GitHub, using fallback:`, error);
			const fallback = await getFallbackContent(uri);
			
			const headers = new Headers();
			headers.set('Content-Type', 'text/markdown; charset=utf-8');
			headers.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}`);
			
			response = new Response(fallback, {
				status: 200,
				headers,
			});
			
			await cache.put(cacheKey, response.clone());
		}
	}

	return response.text();
}

async function getFallbackContent(uri: string): Promise<string> {
	return `# ${uri}

This is a placeholder. The actual content should be bundled at build time or fetched from GitHub.

**Note:** Fallback mechanism not yet implemented in this phase.`;
}

export function listResources(): Array<{ uri: string; name: string; description: string; mimeType: string }> {
	return Object.keys(RESOURCE_PATHS).map((uri) => ({
		uri,
		name: uri.split('/').pop() || uri,
		description: `Armstrong Agency Webflow skill resource: ${uri}`,
		mimeType: 'text/markdown',
	}));
}

import type { Env } from './types';
