import type { RuleDefinition, PageContext } from './engine';

export const seoRules: RuleDefinition[] = [
	{
		id: 'has-title',
		category: 'seo',
		weight: 'error',
		description: 'Page must have a title tag',
		check: async (ctx) => ({
			passed: !!ctx.doc.title && ctx.doc.title.length > 0,
			message: ctx.doc.title ? undefined : 'No title tag found',
		}),
	},
	{
		id: 'title-length',
		category: 'seo',
		weight: 'warning',
		description: 'Title should be between 30-60 characters',
		check: async (ctx) => {
			if (!ctx.doc.title) return { passed: false };
			const length = ctx.doc.title.length;
			return {
				passed: length >= 30 && length <= 60,
				message: `Title length is ${length} characters`,
			};
		},
	},
	{
		id: 'has-meta-description',
		category: 'seo',
		weight: 'error',
		description: 'Page must have a meta description',
		check: async (ctx) => ({
			passed: ctx.html.includes('<meta name="description"'),
			message: 'No meta description found',
		}),
	},
	{
		id: 'has-h1',
		category: 'seo',
		weight: 'error',
		description: 'Page must have exactly one H1 tag',
		check: async (ctx) => {
			const h1Tags = ctx.doc.querySelectorAll('h1');
			return {
				passed: h1Tags.length === 1,
				message: `Found ${h1Tags.length} H1 tags, expected 1`,
			};
		},
	},
];

export const accessibilityRules: RuleDefinition[] = [
	{
		id: 'has-lang',
		category: 'accessibility',
		weight: 'error',
		description: 'HTML element must have lang attribute',
		check: async (ctx) => ({
			passed: ctx.html.includes('<html lang=') || ctx.html.includes("<html lang='"),
			message: 'No lang attribute found on html element',
		}),
	},
	{
		id: 'images-have-alt',
		category: 'accessibility',
		weight: 'error',
		description: 'All images must have alt text',
		check: async (ctx) => {
			const imgTags = ctx.doc.querySelectorAll('img');
			const missingAlt = imgTags.filter((img) => !img.hasAttribute('alt'));
			return {
				passed: missingAlt.length === 0,
				message: `${missingAlt.length} images missing alt text`,
			};
		},
	},
	{
		id: 'form-labels',
		category: 'accessibility',
		weight: 'warning',
		description: 'Form inputs should have associated labels',
		check: async (ctx) => {
			const inputTags = ctx.doc.querySelectorAll('input');
			const missingLabels = inputTags.filter((input) => {
				const id = input.getAttribute('id');
				return !id || !ctx.html.includes(`for="${id}"`);
			});
			return {
				passed: missingLabels.length === 0,
				message: missingLabels.length > 0 ? `${missingLabels.length} inputs without labels` : undefined,
			};
		},
	},
];

export const performanceRules: RuleDefinition[] = [
	{
		id: 'page-size',
		category: 'performance',
		weight: 'warning',
		description: 'Page size should be under 2MB',
		check: async (ctx) => {
			const sizeInMB = ctx.html.length / (1024 * 1024);
			return {
				passed: sizeInMB < 2,
				message: `Page size: ${sizeInMB.toFixed(2)}MB`,
			};
		},
	},
	{
		id: 'too-many-redirects',
		category: 'performance',
		weight: 'info',
		description: 'Minimize redirects',
		check: async (ctx) => ({
			passed: true,
		}),
	},
];

export const bestPracticesRules: RuleDefinition[] = [
	{
		id: 'has-viewport-meta',
		category: 'best-practices',
		weight: 'warning',
		description: 'Page should have viewport meta tag for mobile',
		check: async (ctx) => ({
			passed: ctx.html.includes('name="viewport"'),
			message: 'No viewport meta tag found',
		}),
	},
	{
		id: 'uses-https',
		category: 'best-practices',
		weight: 'error',
		description: 'Page should use HTTPS',
		check: async (ctx) => ({
			passed: ctx.url.startsWith('https://'),
			message: 'Page is not served over HTTPS',
		}),
	},
];

export const allRules: RuleDefinition[] = [
	...seoRules,
	...accessibilityRules,
	...performanceRules,
	...bestPracticesRules,
];
