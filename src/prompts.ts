export interface Prompt {
	name: string;
	description: string;
	arguments: Array<{
		name: string;
		description: string;
		required: boolean;
	}>;
}

const WEBFLOW_MCP_NOTE = `
**Note:** This workflow expects access to a Webflow MCP connection. If you haven't connected one yet, use the wf-mcp-setup skill first.
`;

export const PROMPTS: Prompt[] = [
	{
		name: 'audit-site',
		description: 'Audit a Webflow site without making changes - analyzes style guide, naming convention, and provides diagnosis',
		arguments: [
			{
				name: 'url',
				description: 'The URL of the site to audit',
				required: true,
			},
		],
	},
	{
		name: 'extract-design-system',
		description: 'Extract design system tokens (colors, fonts, type scale, radii) from a source into DESIGN.md',
		arguments: [
			{
				name: 'source',
				description: 'Source URL (Webflow site, Figma file) to extract tokens from',
				required: true,
			},
		],
	},
	{
		name: 'plan-page',
		description: 'Plan a new page section by creating inventory, discovering reusable components, and justifying new elements',
		arguments: [
			{
				name: 'goal',
				description: 'Description of the page/section to plan',
				required: true,
			},
			{
				name: 'source',
				description: 'Optional Figma URL or design reference',
				required: false,
			},
		],
	},
	{
		name: 'prototype-section',
		description: 'Assemble a section on a draft page using only existing classes and components',
		arguments: [
			{
				name: 'goal',
				description: 'Description of the section to prototype',
				required: true,
			},
		],
	},
	{
		name: 'build-section',
		description: 'Build a section following the reuse ladder with confirmation gates and completion evidence',
		arguments: [
			{
				name: 'goal',
				description: 'Description of the section to build',
				required: true,
			},
		],
	},
	{
		name: 'connect-webflow',
		description: 'Set up a project-scoped Webflow MCP connection for a specific workspace',
		arguments: [
			{
				name: 'harness',
				description: 'The harness type: codex, cursor-local, or cursor-cloud',
				required: true,
			},
		],
	},
];

export function getPromptContent(promptName: string, skillContent: string): string {
	const prompt = PROMPTS.find((p) => p.name === promptName);
	if (!prompt) {
		throw new Error(`Unknown prompt: ${promptName}`);
	}

	const needsWebflowMcp = !['extract-design-system', 'connect-webflow'].includes(promptName);

	return `${skillContent}

${needsWebflowMcp ? WEBFLOW_MCP_NOTE : ''}`;
}

export function listPrompts(): Prompt[] {
	return PROMPTS;
}
