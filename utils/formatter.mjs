// Dependencies
import { atRule } from 'postcss';

/**
 * Applies formatting and indentation to a CSS node and its children.
 *
 * @param {Node}   node   The PostCSS node to format.
 * @param {string} indent Optional. Indentation level to apply. Default: ''.
 *
 * @returns {void}
 */
export const formatNode = (node, indent = '') => {
	const tab = '\t';
	const line = '\n';

	// Flatten multiple selectors into one line
	if (node.type === 'rule' && node.selectors && node.selectors.length > 1) {
		node.selector = node.selectors.join(', ');
	}

	// Apply initial indent
	node.raws.before = line + indent;

	// Recursively indent child nodes
	if (node.nodes && Array.isArray(node.nodes)) {
		const childIndent = indent + tab;

		node.nodes.forEach((child) => {
			child.raws.before = line + childIndent;

			// Normalize declarations spacing (key: value)
			if (child.type === 'decl' && child.raws.between != null) {
				child.raws.between = ': ';
			}

			// Recurse into children
			if (child.nodes && child.nodes.length > 0) {
				formatNode(child, childIndent);
			}
		});

		// Line break before closing bracket
		node.raws.after = line + indent;
	}
};

/**
 * Retrieves all nodes from the root that do not belong to a `@layer` block.
 * These orphaned nodes are extracted and removed from the original tree.
 *
 * @param {Root} root The PostCSS root node containing all CSS nodes.
 *
 * @returns {Array}
 */
const getOrphanedNodes = (root) => {
	const orphanedNodes = [];

	root.each((node) => {
		if (!(node.type === 'atrule' && node.name === 'layer')) {
			orphanedNodes.push(node);
			node.remove();
		}
	});

	return orphanedNodes;
};

/**
 * Retrieves all `@layer` at-rules from the root and organizes them by name.
 *
 * @param {Root} root The PostCSS root node containing all CSS nodes.
 *
 * @returns {Map<string, AtRule[]>}
 */
export const getLayers = (root) => {
	const layers = new Map();

	root.each((node) => {
		if (node.type === 'atrule' && node.name === 'layer') {
			const name = node.params || 'root';

			if (!layers.has(name)) {
				layers.set(name, []);
			}

			layers.get(name).push(node);
			node.remove();
		}
	});

	return layers;
};

/**
 * Retrieves orphaned nodes and wraps them in a new `@layer` block.
 * This includes all non-layer nodes, excluding comments related to source maps.
 *
 * @param {Root}  root The PostCSS root node containing all CSS nodes.
 * @param {string} name The name to assign to the newly created `@layer` block.
 *
 * @returns {AtRule}
 */
export const createOrphansLayer = (root, name) => {
	const nodes = getOrphanedNodes(root);
	const validNodes = nodes.filter((n) => !(n.type === 'comment' && n.text?.includes('sourceMappingURL')));

	if (validNodes.length === 0) {
		return;
	}

	const orphanLayer = atRule({
		type: 'atrule',
		name: 'layer',
		parent: undefined,
		params: name
	});

	validNodes.forEach((n) => {
		formatNode(n, '\t');
		orphanLayer.append(n);
	});

	return orphanLayer;
};

/**
 * Retrieves a `@layer` rule with layers ordered according to the specified sequence.
 * Layers listed in `order` are placed first, followed by any remaining layers in original order.
 *
 * @param {string[]} layers The list of all layer names present in the CSS.
 * @param {string[]} order  The preferred order in which layers should be organized.
 *
 * @returns {AtRule}
 */
export const createOrderLayer = (layers, order) => {
	if (layers.length === 0) {
		return;
	}

	// prettier-ignore
	const orderedLayers = [
		...order.filter((name) => layers.includes(name)),
		...layers.filter((name) => !order.includes(name))
	];

	const orderLayer = atRule({
		type: 'atrule',
		name: 'layer',
		parent: undefined,
		params: orderedLayers.join(', ')
	});

	return orderLayer;
};

/**
 * Retrieves and groups `@media` rules by their parameters, then sorts them by priority.
 * Duplicate `@media` queries are merged, preserving node order. Empty rules are removed.
 *
 * @param {AtRule} layer The `@layer` block to process for `@media` queries.
 *
 * @returns {AtRule[]}
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

	return [...mediaMap.entries()].sort(([a], [b]) => orderKey(a) - orderKey(b)).map(([, node]) => node);
};
