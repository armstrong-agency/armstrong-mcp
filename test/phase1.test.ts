import { describe, it, expect } from 'vitest';
import { listResources } from '../src/skills';
import { listPrompts } from '../src/prompts';

describe('Phase 1: Skills', () => {
	it('should list all 14 resources', () => {
		const resources = listResources();
		
		expect(resources).toHaveLength(14);
		expect(resources[0]).toHaveProperty('uri');
		expect(resources[0]).toHaveProperty('name');
		expect(resources[0]).toHaveProperty('description');
		expect(resources[0]).toHaveProperty('mimeType');
	});
	
	it('should include all main skill resources', () => {
		const resources = listResources();
		const uris = resources.map((r) => r.uri);
		
		expect(uris).toContain('skill://wf-audit/SKILL.md');
		expect(uris).toContain('skill://wf-build/SKILL.md');
		expect(uris).toContain('skill://wf-design-system/SKILL.md');
		expect(uris).toContain('skill://wf-mcp-setup/SKILL.md');
		expect(uris).toContain('skill://wf-plan/SKILL.md');
		expect(uris).toContain('skill://wf-prototype/SKILL.md');
		expect(uris).toContain('skill://wf-reference/SKILL.md');
	});
	
	it('should include reference sub-resources', () => {
		const resources = listResources();
		const uris = resources.map((r) => r.uri);
		
		expect(uris).toContain('skill://wf-reference/client-first.md');
		expect(uris).toContain('skill://wf-reference/mast.md');
		expect(uris).toContain('skill://wf-reference/common-issues.md');
	});
	
	it('should list all 6 prompts', () => {
		const prompts = listPrompts();
		
		expect(prompts).toHaveLength(6);
		
		const names = prompts.map((p) => p.name);
		expect(names).toContain('audit-site');
		expect(names).toContain('extract-design-system');
		expect(names).toContain('plan-page');
		expect(names).toContain('prototype-section');
		expect(names).toContain('build-section');
		expect(names).toContain('connect-webflow');
	});
	
	it('should have correct prompt structure', () => {
		const prompts = listPrompts();
		const auditPrompt = prompts.find((p) => p.name === 'audit-site');
		
		expect(auditPrompt).toBeDefined();
		expect(auditPrompt!.description).toBeDefined();
		expect(auditPrompt!.arguments).toHaveLength(1);
		expect(auditPrompt!.arguments[0].name).toBe('url');
		expect(auditPrompt!.arguments[0].required).toBe(true);
	});
});
