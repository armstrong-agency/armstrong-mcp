import { loadPage } from './page';
import { parseHTML } from './evaluator/parser';
import { evaluate, type PageContext } from './evaluator/engine';
import { allRules } from './evaluator/rules';
import type { Env } from './types';

export async function auditPage(url: string, env: Env) {
	const page = await loadPage(url, env);
	const doc = parseHTML(page.html);

	const ctx: PageContext = {
		url: page.finalUrl,
		html: page.html,
		headers: page.headers,
		doc,
	};

	const result = await evaluate(allRules, ctx);

	return {
		url: page.finalUrl,
		score: result.score,
		maxScore: result.maxScore,
		violations: result.violations,
		summary: {
			total: allRules.length,
			passed: allRules.length - result.violations.length,
			failed: result.violations.length,
			byCategory: {
				seo: result.violations.filter((v) => v.category === 'seo').length,
				accessibility: result.violations.filter((v) => v.category === 'accessibility').length,
				performance: result.violations.filter((v) => v.category === 'performance').length,
				'best-practices': result.violations.filter((v) => v.category === 'best-practices').length,
			},
		},
	};
}
