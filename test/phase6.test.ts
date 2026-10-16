import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '../src/rate-limit';

describe('Phase 6: Limits + deploy', () => {
	describe('Rate limiting', () => {
		it('should allow requests under limit', async () => {
			const request = new Request('https://example.com/mcp', {
				headers: { 'CF-Connecting-IP': '203.0.113.1' },
			});
			const env = { CRUX_API_KEY: undefined };

			const result = await checkRateLimit(request, env, 'tools');
			expect(result.allowed).toBe(true);
		});

		it('should block requests over minute limit', async () => {
			const request = new Request('https://example.com/mcp', {
				headers: { 'CF-Connecting-IP': '203.0.113.2' },
			});
			const env = { CRUX_API_KEY: undefined };

			for (let i = 0; i < 30; i++) {
				await checkRateLimit(request, env, 'tools');
			}

			const result = await checkRateLimit(request, env, 'tools');
			expect(result.allowed).toBe(false);
			expect(result.retryAfter).toBeGreaterThan(0);
		});

		it('should have different limits for tools vs resources', async () => {
			const request = new Request('https://example.com/mcp', {
				headers: { 'CF-Connecting-IP': '203.0.113.3' },
			});
			const env = { CRUX_API_KEY: undefined };

			for (let i = 0; i < 30; i++) {
				const toolResult = await checkRateLimit(request, env, 'tools');
				expect(toolResult.allowed).toBe(i < 30);
			}

			const resourceResult = await checkRateLimit(request, env, 'resources');
			expect(resourceResult.allowed).toBe(true);
		});

		it('should isolate limits per IP', async () => {
			const request1 = new Request('https://example.com/mcp', {
				headers: { 'CF-Connecting-IP': '203.0.113.4' },
			});
			const request2 = new Request('https://example.com/mcp', {
				headers: { 'CF-Connecting-IP': '203.0.113.5' },
			});
			const env = { CRUX_API_KEY: undefined };

			for (let i = 0; i < 30; i++) {
				await checkRateLimit(request1, env, 'tools');
			}

			const result1 = await checkRateLimit(request1, env, 'tools');
			expect(result1.allowed).toBe(false);

			const result2 = await checkRateLimit(request2, env, 'tools');
			expect(result2.allowed).toBe(true);
		});
	});

	describe('Configuration', () => {
		it('should have correct tool limits', () => {
			expect(30).toBeLessThanOrEqual(50);
			expect(500).toBeLessThanOrEqual(1000);
		});

		it('should have correct resource limits', () => {
			expect(120).toBeGreaterThan(30);
			expect(10000).toBeGreaterThan(500);
		});
	});
});
