import { describe, it, expect, vi } from 'vitest';
import { checkAiReadiness, scorecard26 } from '../src/scorecard';

const mockEnv = {
	RATE_LIMITER: null,
	CRUX_API_KEY: undefined,
} as any;

const mockEnvWithCrux = {
	RATE_LIMITER: null,
	CRUX_API_KEY: 'mock-key-for-testing',
} as any;

describe('Phase 5: Scorecard', () => {
	describe('check_ai_readiness', () => {
		it('should check all 5 AI readiness items', async () => {
			const result = await checkAiReadiness('https://example.com', mockEnv);
			
			expect(result.items).toHaveLength(5);
			expect(result.items[0].id).toBe('llms-txt');
			expect(result.items[1].id).toBe('robots-ai-bots');
			expect(result.items[2].id).toBe('title-meta');
			expect(result.items[3].id).toBe('json-ld');
			expect(result.items[4].id).toBe('no-template-pages');
		});

		it('should return pass/fail results', async () => {
			const result = await checkAiReadiness('https://example.com', mockEnv);
			
			result.items.forEach((item) => {
				expect(['pass', 'fail', 'manual']).toContain(item.result);
				expect(item.evidence).toBeDefined();
			});
		});
	});

	describe('scorecard_26', () => {
		it('should score all 26 items', async () => {
			const result = await scorecard26('https://example.com', mockEnv);
			
			expect(result.outOf).toBe(26);
			expect(result.score).toBeGreaterThanOrEqual(0);
			expect(result.score).toBeLessThanOrEqual(26);
		});

		it('should have 6 categories', async () => {
			const result = await scorecard26('https://example.com', mockEnv);
			
			expect(result.categories).toHaveLength(6);
			
			const categoryNames = result.categories.map((c) => c.category);
			expect(categoryNames).toContain('ai-readiness');
			expect(categoryNames).toContain('messaging');
			expect(categoryNames).toContain('ux');
			expect(categoryNames).toContain('performance');
			expect(categoryNames).toContain('analytics');
			expect(categoryNames).toContain('accessibility');
		});

		it('should calculate category bands correctly', async () => {
			const result = await scorecard26('https://example.com', mockEnv);
			
			result.categories.forEach((cat) => {
				expect(['green', 'yellow', 'red']).toContain(cat.band);
				expect(cat.score).toBeLessThanOrEqual(cat.outOf);
			});
		});

		it('should mark manual items separately', async () => {
			const result = await scorecard26('https://example.com', mockEnv);
			
			expect(result.manual).toBeDefined();
			expect(result.manual.length).toBeGreaterThan(0);
			
			result.manual.forEach((item) => {
				expect(item.result).toBe('manual');
			});
		});

		it('should degrade gracefully without CrUX API key', async () => {
			const result = await scorecard26('https://example.com', mockEnv);
			
			const perfCategory = result.categories.find((c) => c.category === 'performance');
			expect(perfCategory).toBeDefined();
			
			const lcpItem = perfCategory!.items.find((i) => i.id === 'lcp');
			expect(lcpItem).toBeDefined();
			expect(lcpItem!.result).toBe('manual');
			expect(lcpItem!.evidence).toContain('CrUX');
		});

		it('should show clear CrUX unavailable message', async () => {
			const result = await scorecard26('https://example.com', mockEnv);
			
			const perfCategory = result.categories.find((c) => c.category === 'performance');
			const webVitalsItems = perfCategory!.items.filter((i) => 
				['lcp', 'cls', 'inp'].includes(i.id)
			);
			
			webVitalsItems.forEach((item) => {
				expect(item.result).toBe('manual');
				expect(item.evidence.toLowerCase()).toContain('crux');
			});
		});
	});

	describe('CrUX integration', () => {
		it('should attempt CrUX fetch when key is present', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
				json: async () => ({}),
			});

			const result = await scorecard26('https://example.com', mockEnvWithCrux);
			
			expect(global.fetch).toHaveBeenCalled();
			
			const perfCategory = result.categories.find((c) => c.category === 'performance');
			const lcpItem = perfCategory!.items.find((i) => i.id === 'lcp');
			
			expect(lcpItem!.result).toBe('manual');
			expect(lcpItem!.evidence).toContain('CrUX');
		});
	});
});
