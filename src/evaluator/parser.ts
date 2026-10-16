import type { ParsedDoc, Element } from './engine';

class SimpleElement implements Element {
	constructor(
		public tagName: string,
		public textContent: string | null,
		private attributes: Map<string, string>,
		public children: Element[] = []
	) {}

	getAttribute(name: string): string | null {
		return this.attributes.get(name.toLowerCase()) || null;
	}

	hasAttribute(name: string): boolean {
		return this.attributes.has(name.toLowerCase());
	}
}

function parseElement(html: string, tagName: string): SimpleElement | null {
	const regex = new RegExp(`<${tagName}([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, 'i');
	const match = html.match(regex);
	
	if (!match) return null;
	
	const [, attributesStr, content] = match;
	const attributes = new Map<string, string>();
	
	const attrRegex = /(\w+)=["']([^"']*)["']/g;
	let attrMatch;
	while ((attrMatch = attrRegex.exec(attributesStr))) {
		attributes.set(attrMatch[1].toLowerCase(), attrMatch[2]);
	}
	
	return new SimpleElement(tagName.toLowerCase(), content, attributes);
}

function parseElements(html: string, tagName: string): SimpleElement[] {
	const elements: SimpleElement[] = [];
	
	if (tagName === 'img' || tagName === 'input') {
		const regex = new RegExp(`<${tagName}([^>]*)\/?>`, 'gi');
		let match;
		
		while ((match = regex.exec(html))) {
			const [, attributesStr] = match;
			const attributes = new Map<string, string>();
			
			const attrRegex = /(\w+)=["']([^"']*)["']/g;
			let attrMatch;
			while ((attrMatch = attrRegex.exec(attributesStr))) {
				attributes.set(attrMatch[1].toLowerCase(), attrMatch[2]);
			}
			
			elements.push(new SimpleElement(tagName.toLowerCase(), null, attributes));
		}
		
		return elements;
	}
	
	const regex = new RegExp(`<${tagName}([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
	let match;
	
	while ((match = regex.exec(html))) {
		const [, attributesStr, content] = match;
		const attributes = new Map<string, string>();
		
		const attrRegex = /(\w+)=["']([^"']*)["']/g;
		let attrMatch;
		while ((attrMatch = attrRegex.exec(attributesStr))) {
			attributes.set(attrMatch[1].toLowerCase(), attrMatch[2]);
		}
		
		elements.push(new SimpleElement(tagName.toLowerCase(), content, attributes));
	}
	
	return elements;
}

function parseTitle(html: string): string | null {
	const match = html.match(/<title>([^<]*)<\/title>/i);
	return match ? match[1].trim() : null;
}

export function parseHTML(html: string): ParsedDoc {
	const head = parseElement(html, 'head');
	const body = parseElement(html, 'body');
	const title = parseTitle(html);

	return {
		title,
		head,
		body,
		querySelector: (selector: string) => {
			if (selector.startsWith('#')) {
				return null;
			}
			const tagName = selector.replace(/^\./, '').split('.')[0];
			return parseElement(html, tagName);
		},
		querySelectorAll: (selector: string) => {
			if (selector.startsWith('#')) {
				return [];
			}
			const tagName = selector.replace(/^\./, '').split('.')[0];
			return parseElements(html, tagName);
		},
	};
}
