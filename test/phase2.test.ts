import { describe, it, expect } from 'vitest';
import { loadPage, loadSiteFile } from '../src/page';

const mockEnv = {
	RATE_LIMITER: null,
	CRUX_API_KEY: undefined,
} as any;

describe('Phase 2: Fetch + guard', () => {
	describe('SSRF protection', () => {
		it('should block localhost', async () => {
			await expect(loadPage('http://localhost/test', mockEnv)).rejects.toThrow('blocked');
		});

		it('should block 127.0.0.1', async () => {
			await expect(loadPage('http://127.0.0.1/test', mockEnv)).rejects.toThrow('IP address literals are not allowed');
		});

		it('should block 10.0.0.1 private IP', async () => {
			await expect(loadPage('http://10.0.0.1/test', mockEnv)).rejects.toThrow('IP address literals are not allowed');
		});

		it('should block 192.168.1.1 private IP', async () => {
			await expect(loadPage('http://192.168.1.1/test', mockEnv)).rejects.toThrow('IP address literals are not allowed');
		});

		it('should block 172.16.0.1 private IP', async () => {
			await expect(loadPage('http://172.16.0.1/test', mockEnv)).rejects.toThrow('IP address literals are not allowed');
		});

		it('should block non-standard ports', async () => {
			await expect(loadPage('http://example.com:8080/test', mockEnv)).rejects.toThrow('Only ports 80 and 443 are allowed');
		});

		it('should block non-HTTP(S) protocols', async () => {
			await expect(loadPage('ftp://example.com/test', mockEnv)).rejects.toThrow('Only HTTP and HTTPS protocols are allowed');
		});

		it('should block *.armstrong.so hosts', async () => {
			await expect(loadPage('https://test.armstrong.so/page', mockEnv)).rejects.toThrow('blocked');
		});
	});

	describe('URL validation', () => {
		it('should reject invalid URLs', async () => {
			await expect(loadPage('not-a-url', mockEnv)).rejects.toThrow('Invalid URL');
		});

		it('should allow HTTPS on port 443', async () => {
			await expect(loadPage('https://example.com/', mockEnv)).resolves.toBeDefined();
		});

		it('should allow HTTP on port 80', async () => {
			await expect(loadPage('http://example.com/', mockEnv)).resolves.toBeDefined();
		});
	});

	describe('loadSiteFile', () => {
		it('should fetch robots.txt', async () => {
			const robots = await loadSiteFile('https://example.com', '/robots.txt');
			expect(robots).toBeDefined();
		});

		it('should fetch sitemap.xml', async () => {
			const sitemap = await loadSiteFile('https://example.com', '/sitemap.xml');
			expect(sitemap).toBeDefined();
		});

		it('should return null for missing files', async () => {
			const result = await loadSiteFile('https://example.com', '/llms.txt');
			expect(result).toBeNull();
		});

		it('should respect SSRF guards', async () => {
			const result = await loadSiteFile('http://127.0.0.1', '/robots.txt');
			expect(result).toBeNull();
		});
	});
});
