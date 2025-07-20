// Dependencies
import { atRule } from 'postcss';

/**
 * Ensures a single charset is at the top of the root. If not, moves the first one there.
 *
 * @param {Root} root The PostCSS root containing CSS rules.
 *
 * @returns {void}
 */
export const addRootCharset = (root) => {
	const first = root.first;

	if (!first || first.type !== 'atrule' || first.name !== 'charset' || first.params !== '"UTF-8"') {
		root.prepend({ type: 'atrule', name: 'charset', params: '"UTF-8"' });
	}
};

/**
 * Removes comments based on plugin options.
 *
 * @param {Object}  node           The PostCSS root or node containing CSS rules.
 * @param {string}  removeComments The remove comments option. Accepts 'all', 'non-bang', or 'none'.
 * @param {boolean} minify         The minify option. If true, it may affect comment removal behavior.
 *
 * @returns {void}
 */
export const removeComments = (node, removeComments, minify) => {
	let shouldRun = false;
	let preserveImportant = false;

	if (removeComments === 'all') {
		shouldRun = true;
		preserveImportant = false;
	} else if (removeComments === 'non-bang') {
		shouldRun = true;
		preserveImportant = true;
	} else if (removeComments === 'none' && minify === true) {
		shouldRun = true;
		preserveImportant = true;
	}

	if (!shouldRun) return;

	node.walkComments((comment) => {
		const isImportant = comment.toString().startsWith('/*!');
		if (preserveImportant && isImportant) return;
		comment.remove();
	});
};

/**
 * Retrieves and groups `@media` rules by their parameters, then sorts them by priority.
 * Duplicate `@media` queries are merged, preserving node order. Empty rules are removed.
 *
 * @param {Node} layer The PostCSS layer containing CSS rules.
 *
 * @returns {void}
 */
export const groupAndSortMediaQueries = (layer) => {
	const mediaMap = new Map();

	layer.walkAtRules('media', (media) => {
		if (!media.nodes || media.nodes.length === 0) {
			media.remove();
			return;
		}

		const params = media.params;

		if (!mediaMap.has(params)) {
			mediaMap.set(params, atRule({ name: 'media', params, nodes: [] }));
		}

		media.nodes.forEach((n) => {
			mediaMap.get(params).append(n.clone());
		});

		media.remove();
	});

	const orderKey = (param) => {
		if (/print/.test(param)) return 9999;
		if (/prefers-color-scheme/.test(param)) return 100;
		if (/prefers-/.test(param)) return 200;
		if (/(min|max)-width:\s*(\d+)/.test(param)) {
			const [, , value] = param.match(/(min|max)-width:\s*(\d+)/);
			return parseInt(value, 10);
		}
		return 500;
	};

	[...mediaMap.entries()]
		.sort(([a], [b]) => orderKey(a) - orderKey(b))
		.forEach(([, node]) => {
			layer.append(node);
		});
};
