export interface RuleDefinition {
	id: string;
	category: 'seo' | 'accessibility' | 'performance' | 'best-practices';
	weight: 'error' | 'warning' | 'info';
	description: string;
	check: (ctx: PageContext) => Promise<RuleResult>;
}

export interface RuleResult {
	passed: boolean;
	message?: string;
	evidence?: string[];
}

export interface PageContext {
	url: string;
	html: string;
	headers: Headers;
	doc: ParsedDoc;
}

export interface ParsedDoc {
	title: string | null;
	querySelector: (selector: string) => Element | null;
	querySelectorAll: (selector: string) => Element[];
	head: Element | null;
	body: Element | null;
}

export interface Element {
	tagName: string;
	textContent: string | null;
	getAttribute: (name: string) => string | null;
	hasAttribute: (name: string) => boolean;
	children: Element[];
}

export interface EvaluationResult {
	score: number;
	maxScore: number;
	violations: Array<{
		id: string;
		category: string;
		weight: string;
		description: string;
		message?: string;
		evidence?: string[];
	}>;
}

const WEIGHT_MULTIPLIERS = {
	error: 10,
	warning: 3,
	info: 1,
};

export async function evaluate(rules: RuleDefinition[], ctx: PageContext): Promise<EvaluationResult> {
	const violations: EvaluationResult['violations'] = [];
	let totalDeductions = 0;

	for (const rule of rules) {
		const result = await rule.check(ctx);
		
		if (!result.passed) {
			totalDeductions += WEIGHT_MULTIPLIERS[rule.weight];
			violations.push({
				id: rule.id,
				category: rule.category,
				weight: rule.weight,
				description: rule.description,
				message: result.message,
				evidence: result.evidence,
			});
		}
	}

	const maxPossibleDeductions = rules.length * WEIGHT_MULTIPLIERS.error;
	const score = Math.max(0, Math.round(100 - (totalDeductions / maxPossibleDeductions) * 100));

	return {
		score,
		maxScore: 100,
		violations,
	};
}
