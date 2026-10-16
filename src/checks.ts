import { loadPage } from './page';
import type { Env } from './types';

type Convention = 'client-first' | 'mast' | 'mixed' | 'none';

const CLIENT_FIRST_PATTERNS = [
	/\b[a-z]+_[a-z]+/,
	/\btext-style-/,
	/\btext-size-/,
	/\btext-weight-/,
	/\bspacing-/,
	/\bpadding-/,
	/\bmargin-/,
];

const MAST_PATTERNS = [
	/\b[a-z]+-\d+/,
	/\bcolor-[a-z]+-\d+/,
	/\bsize-\d+/,
	/\bspace-\d+/,
];

export async function detectConvention(url: string, env: Env) {
	const page = await loadPage(url, env);
	
	const classMatches = page.html.match(/class="([^"]*)"/g) || [];
	const allClasses = classMatches
		.map((m) => m.match(/class="([^"]*)"/)?.[1] || '')
		.join(' ')
		.split(/\s+/)
		.filter(Boolean);

	const clientFirstCount = allClasses.filter((cls) =>
		CLIENT_FIRST_PATTERNS.some((pattern) => pattern.test(cls))
	).length;

	const mastCount = allClasses.filter((cls) =>
		MAST_PATTERNS.some((pattern) => pattern.test(cls))
	).length;

	let convention: Convention = 'none';
	let confidence = 0;
	const evidence: string[] = [];

	if (clientFirstCount > 0 && mastCount > 0) {
		convention = 'mixed';
		confidence = 0.5;
		evidence.push(`${clientFirstCount} Client-First patterns`, `${mastCount} Mast patterns`);
	} else if (clientFirstCount > 10) {
		convention = 'client-first';
		confidence = Math.min(0.9, clientFirstCount / 50);
		evidence.push(`${clientFirstCount} Client-First class patterns found`);
		evidence.push('Examples: ' + allClasses.filter((c) => c.includes('_')).slice(0, 5).join(', '));
	} else if (mastCount > 10) {
		convention = 'mast';
		confidence = Math.min(0.9, mastCount / 50);
		evidence.push(`${mastCount} Mast class patterns found`);
		evidence.push('Examples: ' + allClasses.filter((c) => /[a-z]+-\d+/.test(c)).slice(0, 5).join(', '));
	} else {
		convention = 'none';
		confidence = 0.8;
		evidence.push('No clear naming convention detected');
		evidence.push(`Analyzed ${allClasses.length} classes`);
	}

	return {
		url: page.finalUrl,
		convention,
		confidence,
		evidence,
	};
}

export async function extractTokens(url: string, env: Env) {
	const page = await loadPage(url, env);
	
	const colorMatches = page.html.match(/color:\s*([^;}"'\s]+)/g) || [];
	const colors = [...new Set(colorMatches.map((m) => m.split(':')[1]?.trim()))].filter(Boolean);

	const fontMatches = page.html.match(/font-family:\s*([^;}"']+)/g) || [];
	const fonts = [...new Set(fontMatches.map((m) => m.split(':')[1]?.trim()))].filter(Boolean);

	const markdown = `# Design System Tokens

## Colors
${colors.slice(0, 20).map((c, i) => `- Color ${i + 1}: \`${c}\``).join('\n')}

## Typography
${fonts.slice(0, 10).map((f, i) => `- Font ${i + 1}: ${f}`).join('\n')}

## Type Scale
_To be extracted from computed styles_

## Spacing
_To be extracted from padding/margin values_

## Border Radius
_To be extracted from border-radius values_
`;

	return {
		url: page.finalUrl,
		markdown,
	};
}

export async function checkSchema(url: string, env: Env) {
	const page = await loadPage(url, env);
	
	const jsonLdMatches = page.html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
	
	const blocks: Array<{ type: string; valid: boolean; issues: string[] }> = [];
	
	for (const match of jsonLdMatches) {
		const jsonContent = match.match(/<script[^>]*>([\s\S]*?)<\/script>/i)?.[1];
		if (!jsonContent) continue;

		try {
			const data = JSON.parse(jsonContent);
			const type = data['@type'] || 'Unknown';
			
			const issues: string[] = [];
			if (!data['@context']) issues.push('Missing @context');
			if (!data['@type']) issues.push('Missing @type');
			
			blocks.push({
				type,
				valid: issues.length === 0,
				issues,
			});
		} catch {
			blocks.push({
				type: 'Invalid',
				valid: false,
				issues: ['Failed to parse JSON-LD'],
			});
		}
	}

	const missing: string[] = [];
	const foundTypes = blocks.map((b) => b.type);
	
	if (!foundTypes.includes('Organization')) missing.push('Organization');
	if (!foundTypes.includes('WebSite')) missing.push('WebSite');

	return {
		url: page.finalUrl,
		blocks,
		missing,
	};
}
