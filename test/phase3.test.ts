import { describe, it, expect } from 'vitest';
import { evaluate } from '../src/evaluator/engine';
import { seoRules, accessibilityRules } from '../src/evaluator/rules';
import { parseHTML } from '../src/evaluator/parser';
import type { PageContext } from '../src/evaluator/engine';

describe('Phase 3: Evaluator port', () => {
	describe('Engine', () => {
		it('should calculate score based on violations', async () => {
			const mockContext: PageContext = {
				url: 'https://example.com',
				html: '<html><head><title>Test</title></head><body></body></html>',
				headers: new Headers(),
				doc: parseHTML('<html><head><title>Test</title></head><body></body></html>'),
			};

			const result = await evaluate([seoRules[0]], mockContext);
			expect(result.score).toBeGreaterThanOrEqual(0);
			expect(result.score).toBeLessThanOrEqual(100);
		});

		it('should return 100 for perfect pages', async () => {
			const html = '<html lang="en"><head><title>Perfect 50 Character Title For Testing SEO</title><meta name="description" content="Test"></head><body><h1>Heading</h1></body></html>';
			const mockContext: PageContext = {
				url: 'https://example.com',
				html,
				headers: new Headers(),
				doc: parseHTML(html),
			};

			const result = await evaluate(seoRules.slice(0, 3), mockContext);
			expect(result.violations).toHaveLength(0);
		});
	});

	describe('SEO Rules', () => {
		it('should detect missing title', async () => {
			const html = '<html><head></head><body></body></html>';
			const mockContext: PageContext = {
				url: 'https://example.com',
				html,
				headers: new Headers(),
				doc: parseHTML(html),
			};

			const result = await seoRules[0].check(mockContext);
			expect(result.passed).toBe(false);
		});

		it('should detect present title', async () => {
			const html = '<html><head><title>Test Page</title></head><body></body></html>';
			const mockContext: PageContext = {
				url: 'https://example.com',
				html,
				headers: new Headers(),
				doc: parseHTML(html),
			};

			const result = await seoRules[0].check(mockContext);
			expect(result.passed).toBe(true);
		});

		it('should detect H1 count', async () => {
			const html = '<html><body><h1>First</h1><h1>Second</h1></body></html>';
			const mockContext: PageContext = {
				url: 'https://example.com',
				html,
				headers: new Headers(),
				doc: parseHTML(html),
			};

			const result = await seoRules[3].check(mockContext);
			expect(result.passed).toBe(false);
			expect(result.message).toContain('2 H1 tags');
		});
	});

	describe('Accessibility Rules', () => {
		it('should detect missing lang attribute', async () => {
			const html = '<html><head></head><body></body></html>';
			const mockContext: PageContext = {
				url: 'https://example.com',
				html,
				headers: new Headers(),
				doc: parseHTML(html),
			};

			const result = await accessibilityRules[0].check(mockContext);
			expect(result.passed).toBe(false);
		});

		it('should detect images without alt', async () => {
			const html = '<html><body><img src="test.jpg"></body></html>';
			const mockContext: PageContext = {
				url: 'https://example.com',
				html,
				headers: new Headers(),
				doc: parseHTML(html),
			};

			const result = await accessibilityRules[1].check(mockContext);
			expect(result.passed).toBe(false);
		});
	});

	describe('Parser', () => {
		it('should parse title', () => {
			const html = '<html><head><title>Test Title</title></head></html>';
			const doc = parseHTML(html);
			expect(doc.title).toBe('Test Title');
		});

		it('should parse elements', () => {
			const html = '<html><body><h1>Heading</h1><p>Paragraph</p></body></html>';
			const doc = parseHTML(html);
			const h1s = doc.querySelectorAll('h1');
			expect(h1s).toHaveLength(1);
			expect(h1s[0].textContent).toBe('Heading');
		});
	});
});
