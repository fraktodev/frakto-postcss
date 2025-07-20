// Dependencies
import fs from 'fs';
import path from 'path';
import pc from 'picocolors';
import selectorParser from 'postcss-selector-parser';

/**
 * Retrieves raw source content by walking the filesystem based on path and extension rules.
 *
 * @param {string|string[]} includePaths - Relative directories to scan from `process.cwd()`.
 * @param {string|string[]} excludePaths - Relative directories to skip (e.g., `node_modules`, `.git`).
 * @param {string|string[]} extensions   - List of file extensions to include (without dot, e.g., 'html', 'astro').
 *
 * @returns {string}
 */
export const resolveSource = (includePaths, excludePaths, files) => {
	let rawContent = '';

	const validExtensions = ['html', 'astro', 'jsx', 'tsx'];

	const inputExtensions = Array.isArray(files) ? files : [files];
	const normalizedExtensions = [];
	const invalidExtensions = [];

	for (const extRaw of inputExtensions) {
		if (typeof extRaw !== 'string') continue;

		const ext = extRaw.trim().replace(/^\./, '');
		if (validExtensions.includes(ext)) {
			normalizedExtensions.push(`.${ext}`);
		} else {
			invalidExtensions.push(`.${ext}`);
		}
	}

	if (invalidExtensions.length > 0) {
		console.warn(
			pc.bold(pc.yellow('[frakto-postcss]:')) +
				pc.yellow(' The following extensions are not valid and will be ignored:\n') +
				invalidExtensions.map((e) => pc.yellow(`  - ${e}`)).join('\n')
		);
	}

	const includes = Array.isArray(includePaths) ? includePaths : [includePaths];
	const excludes = Array.isArray(excludePaths) ? excludePaths : [excludePaths];

	const isValidExtension = (filePath) => normalizedExtensions.includes(path.extname(filePath));
	const shouldExclude = (relPath) => excludes.some((excluded) => relPath.split(path.sep).includes(excluded));

	const walk = (dir) => {
		let collected = [];

		for (const entry of fs.readdirSync(dir)) {
			const fullPath = path.join(dir, entry);
			const relPath = path.relative(process.cwd(), fullPath);

			if (shouldExclude(relPath)) continue;

			if (fs.statSync(fullPath).isDirectory()) {
				collected = collected.concat(walk(fullPath));
			} else if (isValidExtension(fullPath)) {
				collected.push(fs.readFileSync(fullPath, 'utf8'));
			}
		}

		return collected;
	};

	for (const includePath of includes) {
		const baseDir = path.resolve(process.cwd(), includePath);

		if (fs.existsSync(baseDir)) {
			rawContent += walk(baseDir).join('\n');
		} else {
			console.warn(
				pc.bold(pc.yellow('[frakto-postcss] ')) +
					pc.yellow('Include path does not exist: ') +
					pc.bold(pc.yellow(includePath))
			);
		}
	}

	if (!rawContent.trim()) {
		console.warn(
			`${pc.bold(pc.yellow('[frakto-postcss]'))} ${pc.yellow('No source files matched the given patterns.')}`
		);
	}

	return rawContent;
};

/**
 * Retrieves all HTML-like tag names from the given content.
 * Supports tag extraction from HTML, React (JSX), and Astro files.
 *
 * @param {string} content The full content to extract from.
 *
 * @returns {string[]}
 */
export const getTags = (content) => {
	if (typeof content !== 'string') return [];

	const tagRegex = /<([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g;
	const tags = new Set();

	let match;
	while ((match = tagRegex.exec(content)) !== null) {
		tags.add(match[1].toLowerCase());
	}

	return [...tags];
};

/**
 * Retrieves all ID selectors from the given content.
 * Supports `id="..."` attributes in HTML, Astro and JSX-like syntax.
 *
 * @param {string} content The full content to extract from.
 *
 * @returns {string[]}
 */
export const getIds = (content) => {
	if (typeof content !== 'string') return [];

	const idRegex = /\bid\s*=\s*["']([^"']+)["']/gi;
	const matches = [...content.matchAll(idRegex)];
	const ids = new Set();

	for (const match of matches) {
		match[1].split(/\s+/).forEach((id) => {
			if (id.trim()) ids.add(id.trim());
		});
	}

	return [...ids];
};

/**
 * Retrieves all CSS class names from the given content.
 * Supports `class="..."` attributes in HTML, Astro, and `className="..."` in JSX/React.
 *
 * @param {string} content The full content to extract from.
 *
 * @returns {string[]}
 */
export const getClasses = (content) => {
	if (typeof content !== 'string') return [];

	const classRegex = /\b(?:class|className)\s*=\s*["']([^"']+)["']/gi;
	const matches = [...content.matchAll(classRegex)];
	const classes = new Set();

	for (const match of matches) {
		match[1].split(/\s+/).forEach((cls) => {
			if (cls.trim()) classes.add(cls.trim());
		});
	}

	return [...classes];
};

/**
 * Removes any charset rules found within a layer.
 *
 * @param {Node} node The PostCSS root or node containing CSS rules.
 *
 * @returns {void}
 */
export const charsets = (node) => {
	node.walkAtRules('charset', (atRule) => {
		atRule.remove();
	});
};

/**
 * Retrieves the purged rule set by removing selectors not found in safe lists.
 *
 * Iterates over all rule selectors and validates tags, classes, and universal selectors
 * against their respective safe lists. Invalid selectors are removed from the rule or discarded entirely.
 *
 * @param {Node}              layer           The PostCSS layer containing CSS rules.
 * @param {string[]}          tagWhiteList    Tags that are allowed to remain during purging.
 * @param {(string|RegExp)[]} idWhiteList     Ids or patterns allowed during purging.
 * @param {(string|RegExp)[]} classWhiteList  Classes or patterns allowed during purging.
 *
 * @returns {void}
 */
export const nodes = (layer, tagWhiteList, idWhiteList, classWhiteList) => {
	const globalWhiteList = [':root', '*', 'html', 'body'];

	layer.walkRules((rule) => {
		if (!rule.selector) return;

		const keepSelectors = [];

		try {
			selectorParser((selectors) => {
				selectors.each((selector) => {
					let isValid = true;

					selector.walk((node) => {
						if (node.type === 'tag' && !tagWhiteList.includes(node.value)) {
							isValid = false;
						}

						if (
							node.type === 'id' &&
							!idWhiteList.some((safe) =>
								typeof safe === 'string'
									? safe === node.value
									: safe instanceof RegExp && safe.test(node.value)
							)
						) {
							isValid = false;
						}

						if (
							node.type === 'class' &&
							!classWhiteList.some((safe) =>
								typeof safe === 'string'
									? safe === node.value
									: safe instanceof RegExp && safe.test(node.value)
							)
						) {
							isValid = false;
						}

						if (node.type === 'universal' && !globalWhiteList.includes(node.value)) {
							isValid = false;
						}
					});

					if (isValid) {
						keepSelectors.push(selector.toString());
					}
				});
			}).processSync(rule.selector);

			if (keepSelectors.length === 0) {
				rule.remove();
			} else {
				rule.selector = keepSelectors.join(', ');
			}
		} catch (error) {
			console.warn(
				pc.bold(pc.yellow('[frakto-postcss]: ')) + pc.yellow(`Error purging selector: ${rule.selector}`),
				error
			);
		}
	});
};
