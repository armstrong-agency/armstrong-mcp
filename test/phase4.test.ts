import { describe, it, expect } from 'vitest';
import { detectConvention, extractTokens, checkSchema } from '../src/checks';

const mockEnv = {
	RATE_LIMITER: null,
	CRUX_API_KEY: undefined,
} as any;

describe('Phase 4: New checks', () => {
	describe('detect_convention', () => {
		it('should detect naming convention from URL', async () => {
			const result = await detectConvention('https://example.com', mockEnv);
			
			expect(result).toHaveProperty('url');
			expect(result).toHaveProperty('convention');
			expect(result).toHaveProperty('confidence');
			expect(result).toHaveProperty('evidence');
			expect(['client-first', 'mast', 'mixed', 'none']).toContain(result.convention);
		});
	});

	describe('extract_tokens', () => {
		it('should extract design tokens as markdown', async () => {
			const result = await extractTokens('https://example.com', mockEnv);
			
			expect(result).toHaveProperty('url');
			expect(result).toHaveProperty('markdown');
			expect(result.markdown).toContain('# Design System Tokens');
			expect(result.markdown).toContain('## Colors');
		});
	});

	describe('check_schema', () => {
		it('should find and validate JSON-LD blocks', async () => {
			const result = await checkSchema('https://example.com', mockEnv);
			
			expect(result).toHaveProperty('url');
			expect(result).toHaveProperty('blocks');
			expect(result).toHaveProperty('missing');
			expect(Array.isArray(result.blocks)).toBe(true);
			expect(Array.isArray(result.missing)).toBe(true);
		});
	});
});
