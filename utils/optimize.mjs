// Dependencies
import { atRule } from 'postcss';

/**
 * Ensures a single charset is at the top of the root. If not, moves the first one there.
 *
 * @param {Object} root The PostCSS root containing CSS rules.
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
 * Retrieves and groups `@media` rules by their parameters, then sorts them by priority.
 * Duplicate `@media` queries are merged, preserving node order. Empty rules are removed.
 *
 * @param {AtRule} layer The `@layer` block to process for `@media` queries.
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
