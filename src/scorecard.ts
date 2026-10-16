import { loadPage, loadSiteFile } from './page';
import { checkSchema } from './checks';
import type { Env } from './types';

interface AiReadinessItem {
	id: string;
	label: string;
	result: 'pass' | 'fail' | 'manual';
	evidence: string;
}

export async function checkAiReadiness(url: string, env: Env): Promise<{ items: AiReadinessItem[] }> {
	const page = await loadPage(url, env);
	const origin = new URL(page.finalUrl).origin;
	
	const items: AiReadinessItem[] = [];

	const llmsTxt = await loadSiteFile(origin, '/llms.txt');
	items.push({
		id: 'llms-txt',
		label: 'llms.txt present',
		result: llmsTxt ? 'pass' : 'fail',
		evidence: llmsTxt ? 'llms.txt file found' : 'No llms.txt file',
	});

	const robotsTxt = await loadSiteFile(origin, '/robots.txt');
	const allowsAiBots = robotsTxt && (
		!robotsTxt.includes('User-agent: GPTBot') ||
		!robotsTxt.includes('Disallow: /')
	) && (
		!robotsTxt.includes('User-agent: ClaudeBot') ||
		!robotsTxt.includes('Disallow: /')
	);
	
	items.push({
		id: 'robots-ai-bots',
		label: 'robots.txt allows AI bots (GPTBot, ClaudeBot, PerplexityBot)',
		result: allowsAiBots ? 'pass' : 'fail',
		evidence: allowsAiBots ? 'AI bots not blocked' : 'Some AI bots blocked in robots.txt',
	});

	const hasTitle = page.html.includes('<title>') && page.html.match(/<title>([^<]+)<\/title>/)?.[1];
	const hasMetaDesc = page.html.includes('name="description"');
	
	items.push({
		id: 'title-meta',
		label: 'Title and meta description present',
		result: (hasTitle && hasMetaDesc) ? 'pass' : 'fail',
		evidence: hasTitle && hasMetaDesc ? 'Both present' : `Missing: ${!hasTitle ? 'title ' : ''}${!hasMetaDesc ? 'meta description' : ''}`,
	});

	const schema = await checkSchema(url, env);
	const hasOrg = schema.blocks.some((b) => b.type === 'Organization');
	const hasWebSite = schema.blocks.some((b) => b.type === 'WebSite');
	
	items.push({
		id: 'json-ld',
		label: 'Organization and WebSite JSON-LD present',
		result: (hasOrg && hasWebSite) ? 'pass' : 'fail',
		evidence: `Found: ${hasOrg ? 'Organization ' : ''}${hasWebSite ? 'WebSite' : ''} ${!hasOrg && !hasWebSite ? 'None' : ''}`,
	});

	const sitemapXml = await loadSiteFile(origin, '/sitemap.xml');
	const hasTemplatePages = sitemapXml && (
		sitemapXml.includes('template') ||
		sitemapXml.includes('draft') ||
		sitemapXml.includes('test')
	);
	
	items.push({
		id: 'no-template-pages',
		label: 'No template pages in sitemap',
		result: !hasTemplatePages ? 'pass' : 'fail',
		evidence: hasTemplatePages ? 'Template/draft pages found in sitemap' : 'No template pages detected',
	});

	return { items };
}

interface CruxMetrics {
	available: boolean;
	lcp?: number;
	cls?: number;
	inp?: number;
	message?: string;
}

async function fetchCruxMetrics(url: string, apiKey: string | undefined): Promise<CruxMetrics> {
	if (!apiKey) {
		return {
			available: false,
			message: 'CrUX API key not configured',
		};
	}

	try {
		const cruxUrl = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${apiKey}`;
		const response = await fetch(cruxUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				origin: new URL(url).origin,
				formFactor: 'PHONE',
				metrics: ['largest_contentful_paint', 'cumulative_layout_shift', 'interaction_to_next_paint'],
			}),
		});

		if (!response.ok) {
			return {
				available: false,
				message: `CrUX API error: ${response.status}`,
			};
		}

		const data = await response.json() as any;
		
		return {
			available: true,
			lcp: data.record?.metrics?.largest_contentful_paint?.percentiles?.p75,
			cls: data.record?.metrics?.cumulative_layout_shift?.percentiles?.p75,
			inp: data.record?.metrics?.interaction_to_next_paint?.percentiles?.p75,
		};
	} catch (error) {
		return {
			available: false,
			message: `CrUX fetch failed: ${error}`,
		};
	}
}

type CategoryName = 'ai-readiness' | 'messaging' | 'ux' | 'performance' | 'analytics' | 'accessibility';
type Band = 'green' | 'yellow' | 'red';

interface ScorecardItem {
	id: string;
	category: CategoryName;
	label: string;
	result: 'pass' | 'fail' | 'manual';
	evidence: string;
}

interface CategoryScore {
	category: CategoryName;
	score: number;
	outOf: number;
	band: Band;
	items: ScorecardItem[];
}

interface Scorecard {
	url: string;
	score: number;
	outOf: number;
	band: Band;
	categories: CategoryScore[];
	manual: ScorecardItem[];
}

function calculateBand(passed: number, total: number): Band {
	if (passed === total) return 'green';
	if (passed > total / 2) return 'yellow';
	return 'red';
}

export async function scorecard26(url: string, env: Env): Promise<Scorecard> {
	const page = await loadPage(url, env);
	const aiReadiness = await checkAiReadiness(url, env);
	const schema = await checkSchema(url, env);
	const crux = await fetchCruxMetrics(url, env.CRUX_API_KEY);

	const allItems: ScorecardItem[] = [];

	aiReadiness.items.forEach((item) => {
		allItems.push({
			id: item.id,
			category: 'ai-readiness',
			label: item.label,
			result: item.result,
			evidence: item.evidence,
		});
	});

	allItems.push(
		{
			id: 'customer-problem',
			category: 'messaging',
			label: 'Customer and problem stated clearly',
			result: 'manual',
			evidence: 'Manual review required',
		},
		{
			id: 'what-you-do',
			category: 'messaging',
			label: 'What you do and steps explained',
			result: 'manual',
			evidence: 'Manual review required',
		},
		{
			id: 'repeated-cta',
			category: 'messaging',
			label: 'One repeated CTA throughout',
			result: 'manual',
			evidence: 'Manual review required',
		},
		{
			id: 'proof-near-ask',
			category: 'messaging',
			label: 'Proof near the ask',
			result: 'manual',
			evidence: 'Manual review required',
		}
	);

	const h1Count = (page.html.match(/<h1[^>]*>/gi) || []).length;
	allItems.push({
		id: 'single-h1',
		category: 'ux',
		label: 'Single H1 per page',
		result: h1Count === 1 ? 'pass' : 'fail',
		evidence: `Found ${h1Count} H1 tags`,
	});

	const hasNav = page.html.includes('<nav') || page.html.match(/class="[^"]*nav[^"]*"/i);
	const navItems = hasNav ? (page.html.match(/<a[^>]*>/gi) || []).length : 0;
	allItems.push({
		id: 'nav-present',
		category: 'ux',
		label: 'Navigation present with ≤7 top items',
		result: hasNav && navItems <= 7 ? 'pass' : hasNav ? 'fail' : 'fail',
		evidence: hasNav ? `Nav with ${navItems} links` : 'No navigation found',
	});

	allItems.push(
		{
			id: 'cta-above-fold',
			category: 'ux',
			label: 'CTA above fold on mobile',
			result: 'manual',
			evidence: 'Requires rendering - manual check',
		},
		{
			id: 'form-works',
			category: 'ux',
			label: 'Form works',
			result: 'manual',
			evidence: 'Requires testing - manual check',
		}
	);

	if (crux.available) {
		allItems.push(
			{
				id: 'lcp',
				category: 'performance',
				label: 'Mobile LCP ≤2.5s',
				result: crux.lcp && crux.lcp <= 2500 ? 'pass' : crux.lcp ? 'fail' : 'manual',
				evidence: crux.lcp ? `LCP: ${(crux.lcp / 1000).toFixed(2)}s` : 'CrUX data unavailable',
			},
			{
				id: 'cls',
				category: 'performance',
				label: 'Mobile CLS ≤0.1',
				result: crux.cls !== undefined && crux.cls <= 0.1 ? 'pass' : crux.cls !== undefined ? 'fail' : 'manual',
				evidence: crux.cls !== undefined ? `CLS: ${crux.cls.toFixed(3)}` : 'CrUX data unavailable',
			},
			{
				id: 'inp',
				category: 'performance',
				label: 'Mobile INP ≤200ms',
				result: crux.inp && crux.inp <= 200 ? 'pass' : crux.inp ? 'fail' : 'manual',
				evidence: crux.inp ? `INP: ${crux.inp}ms` : 'CrUX data unavailable',
			}
		);
	} else {
		allItems.push(
			{
				id: 'lcp',
				category: 'performance',
				label: 'Mobile LCP ≤2.5s',
				result: 'manual',
				evidence: crux.message || 'CrUX unavailable',
			},
			{
				id: 'cls',
				category: 'performance',
				label: 'Mobile CLS ≤0.1',
				result: 'manual',
				evidence: crux.message || 'CrUX unavailable',
			},
			{
				id: 'inp',
				category: 'performance',
				label: 'Mobile INP ≤200ms',
				result: 'manual',
				evidence: crux.message || 'CrUX unavailable',
			}
		);
	}

	const pageWeight = page.bytes / (1024 * 1024);
	allItems.push({
		id: 'page-weight',
		category: 'performance',
		label: 'Page weight ≤2MB',
		result: pageWeight <= 2 ? 'pass' : 'fail',
		evidence: `${pageWeight.toFixed(2)}MB`,
	});

	const hasAnalytics = page.html.includes('gtag') || page.html.includes('analytics') || page.html.includes('plausible');
	allItems.push({
		id: 'analytics-present',
		category: 'analytics',
		label: 'Active analytics tool present',
		result: hasAnalytics ? 'pass' : 'fail',
		evidence: hasAnalytics ? 'Analytics detected' : 'No analytics found',
	});

	const scriptTags = (page.html.match(/<script[^>]*>/gi) || []).length;
	const uniqueScripts = new Set(page.html.match(/<script[^>]*src="([^"]+)"/gi) || []).size;
	allItems.push({
		id: 'no-duplicate-tags',
		category: 'analytics',
		label: 'No duplicate or dead tags',
		result: scriptTags === uniqueScripts ? 'pass' : 'fail',
		evidence: `${scriptTags} scripts, ${uniqueScripts} unique`,
	});

	const sitemap = await loadSiteFile(new URL(page.finalUrl).origin, '/sitemap.xml');
	const cleanSitemap = sitemap && !sitemap.includes('?') && !sitemap.includes('draft');
	allItems.push({
		id: 'sitemap-clean',
		category: 'analytics',
		label: 'Sitemap clean',
		result: cleanSitemap ? 'pass' : 'fail',
		evidence: cleanSitemap ? 'Sitemap clean' : 'Sitemap has issues or missing',
	});

	allItems.push(
		{
			id: 'consent-respects-reject',
			category: 'analytics',
			label: 'Consent respects reject',
			result: 'manual',
			evidence: 'Requires consent testing - manual check',
		},
		{
			id: 'conversion-event',
			category: 'analytics',
			label: 'Conversion event tracked',
			result: 'manual',
			evidence: 'Requires analytics inspection - manual check',
		}
	);

	const hasLang = page.html.includes('<html lang=');
	allItems.push({
		id: 'html-lang',
		category: 'accessibility',
		label: 'HTML lang attribute present',
		result: hasLang ? 'pass' : 'fail',
		evidence: hasLang ? 'lang attribute found' : 'No lang attribute',
	});

	const images = (page.html.match(/<img[^>]*>/gi) || []);
	const imagesWithAlt = images.filter((img) => img.includes('alt=')).length;
	allItems.push({
		id: 'image-alt',
		category: 'accessibility',
		label: 'Images have alt text',
		result: images.length === imagesWithAlt ? 'pass' : 'fail',
		evidence: `${imagesWithAlt}/${images.length} images have alt`,
	});

	const inputs = (page.html.match(/<input[^>]*>/gi) || []);
	const inputsWithLabels = inputs.filter((input) => {
		const id = input.match(/id="([^"]+)"/)?.[1];
		return id && page.html.includes(`for="${id}"`);
	}).length;
	allItems.push({
		id: 'form-labels',
		category: 'accessibility',
		label: 'Form inputs have labels',
		result: inputs.length === inputsWithLabels ? 'pass' : 'fail',
		evidence: `${inputsWithLabels}/${inputs.length} inputs labeled`,
	});

	allItems.push({
		id: 'contrast',
		category: 'accessibility',
		label: 'Sufficient color contrast',
		result: 'manual',
		evidence: 'Requires computed styles - manual check',
	});

	const categories: CategoryScore[] = ([
		{ category: 'ai-readiness' as CategoryName, outOf: 5 },
		{ category: 'messaging' as CategoryName, outOf: 4 },
		{ category: 'ux' as CategoryName, outOf: 4 },
		{ category: 'performance' as CategoryName, outOf: 4 },
		{ category: 'analytics' as CategoryName, outOf: 5 },
		{ category: 'accessibility' as CategoryName, outOf: 4 },
	] as const).map((cat) => {
		const items = allItems.filter((item) => item.category === cat.category);
		const passed = items.filter((item) => item.result === 'pass').length;
		return {
			category: cat.category,
			outOf: cat.outOf,
			score: passed,
			band: calculateBand(passed, cat.outOf),
			items,
		};
	});

	const totalPassed = allItems.filter((item) => item.result === 'pass').length;
	const manual = allItems.filter((item) => item.result === 'manual');

	return {
		url: page.finalUrl,
		score: totalPassed,
		outOf: 26,
		band: calculateBand(totalPassed, 26),
		categories,
		manual,
	};
}
