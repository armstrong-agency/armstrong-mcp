import type { Env } from './types';

export interface Page {
	url: string;
	finalUrl: string;
	status: number;
	html: string;
	headers: Headers;
	bytes: number;
}

const MAX_BODY_SIZE = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10000;
const MAX_REDIRECTS = 5;
const USER_AGENT = 'ArmstrongMCP/1.0 (+https://armstrong.so/mcp)';

const BLOCKED_HOSTS = [
	'localhost',
	'*.armstrong.so',
	'*.cloudflare.com',
	'*.workers.dev',
];

const PRIVATE_IP_RANGES = [
	/^127\./,
	/^10\./,
	/^172\.(1[6-9]|2[0-9]|3[01])\./,
	/^192\.168\./,
	/^169\.254\./,
	/^fe80:/i,
	/^::1$/,
	/^::ffff:127\./,
];

function isPrivateIP(hostname: string): boolean {
	for (const pattern of PRIVATE_IP_RANGES) {
		if (pattern.test(hostname)) {
			return true;
		}
	}
	return false;
}

function isIPAddress(hostname: string): boolean {
	return /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || 
	       /^[0-9a-f:]+$/i.test(hostname);
}

function isBlockedHost(hostname: string): boolean {
	for (const blocked of BLOCKED_HOSTS) {
		if (blocked.startsWith('*.')) {
			const domain = blocked.slice(2);
			if (hostname.endsWith(`.${domain}`)) {
				return true;
			}
		} else if (hostname === blocked) {
			return true;
		}
	}
	return false;
}

function validateUrl(urlString: string): void {
	let url: URL;
	
	try {
		url = new URL(urlString);
	} catch {
		throw new Error('Invalid URL');
	}

	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error('Only HTTP and HTTPS protocols are allowed');
	}

	const port = url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80);
	if (port !== 80 && port !== 443) {
		throw new Error('Only ports 80 and 443 are allowed');
	}

	const hostname = url.hostname.toLowerCase();

	if (isIPAddress(hostname)) {
		throw new Error('IP address literals are not allowed');
	}

	if (isPrivateIP(hostname)) {
		throw new Error('Private IP ranges are not allowed');
	}

	if (isBlockedHost(hostname)) {
		throw new Error(`Host ${hostname} is blocked`);
	}
}

async function fetchWithTimeout(url: string, timeout: number, signal?: AbortSignal): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const combinedSignal = signal ? 
			AbortSignal.any([signal, controller.signal]) :
			controller.signal;

		const response = await fetch(url, {
			signal: combinedSignal,
			headers: {
				'User-Agent': USER_AGENT,
			},
			redirect: 'manual',
		});

		return response;
	} finally {
		clearTimeout(timeoutId);
	}
}

export async function loadPage(url: string, env: Env): Promise<Page> {
	validateUrl(url);

	const cacheKey = new Request(`https://cache.armstrong.internal/page/${url}`);
	const cache = caches.default;

	const cached = await cache.match(cacheKey);
	if (cached) {
		const page = await cached.json() as Page;
		return page;
	}

	let currentUrl = url;
	let redirectCount = 0;
	let response: Response | null = null;

	while (redirectCount <= MAX_REDIRECTS) {
		response = await fetchWithTimeout(currentUrl, FETCH_TIMEOUT_MS);

		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get('location');
			if (!location) {
				throw new Error('Redirect without Location header');
			}

			const nextUrl = new URL(location, currentUrl).toString();
			validateUrl(nextUrl);

			currentUrl = nextUrl;
			redirectCount++;

			if (redirectCount > MAX_REDIRECTS) {
				throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`);
			}

			continue;
		}

		break;
	}

	if (!response) {
		throw new Error('No response received');
	}

	const contentLength = response.headers.get('content-length');
	if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
		throw new Error(`Response too large (max ${MAX_BODY_SIZE} bytes)`);
	}

	const reader = response.body?.getReader();
	if (!reader) {
		throw new Error('No response body');
	}

	const chunks: Uint8Array[] = [];
	let totalBytes = 0;

	try {
		while (true) {
			const { done, value } = await reader.read();
			
			if (done) break;
			
			totalBytes += value.length;
			
			if (totalBytes > MAX_BODY_SIZE) {
				reader.cancel();
				throw new Error(`Response too large (max ${MAX_BODY_SIZE} bytes)`);
			}
			
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}

	const allChunks = new Uint8Array(totalBytes);
	let position = 0;
	for (const chunk of chunks) {
		allChunks.set(chunk, position);
		position += chunk.length;
	}

	const html = new TextDecoder('utf-8').decode(allChunks);

	const page: Page = {
		url,
		finalUrl: currentUrl,
		status: response.status,
		html,
		headers: response.headers,
		bytes: totalBytes,
	};

	const cacheResponse = new Response(JSON.stringify(page), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'public, max-age=600',
		},
	});

	await cache.put(cacheKey, cacheResponse);

	return page;
}

export async function loadSiteFile(origin: string, path: '/robots.txt' | '/sitemap.xml' | '/llms.txt'): Promise<string | null> {
	const url = `${origin}${path}`;
	
	try {
		validateUrl(url);
		
		const response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
		
		if (!response.ok) {
			return null;
		}
		
		const text = await response.text();
		
		if (text.length > MAX_BODY_SIZE) {
			throw new Error(`File too large (max ${MAX_BODY_SIZE} bytes)`);
		}
		
		return text;
	} catch (error) {
		console.warn(`Failed to load ${path}:`, error);
		return null;
	}
}
