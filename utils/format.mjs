// Dependencies
import { atRule } from 'postcss';

/**
 * Retrieves all `@layer` at-rules from the root and organizes them by name.
 *
 * @param {Root} root The PostCSS root containing CSS rules.
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
 * Applies formatting and indentation to a CSS node and its children.
 *
 * @param {Node}   node   The PostCSS root or node containing CSS rules.
 * @param {string} indent Optional. Indentation level to apply. Default: ''.
 *
 * @returns {void}
 */
export const addIndentNode = (node, indent = '') => {
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
				addIndentNode(child, childIndent);
			}
		});

		// Line break before closing bracket
		node.raws.after = line + indent;
	}
};

/**
 * Retrieves orphaned nodes and wraps them in a new `@layer` block.
 * This includes all non-layer nodes, excluding comments related to source maps.
 *
 * @param {Root}   root The PostCSS root containing CSS rules.
 * @param {string} name The name to assign to the newly created `@layer` block.
 *
 * @returns {AtRule|undefined}
 */
export const addOrphansLayer = (root, name) => {
	const orphanLayer = atRule({
		type: 'atrule',
		name: 'layer',
		params: name
	});

	let hasContent = false;

	root.each((node) => {
		if (node.type === 'rule' || node.type === 'decl') {
			node.remove();
			addIndentNode(node, '\t');
			orphanLayer.append(node);
			hasContent = true;
		}
	});

	return hasContent ? orphanLayer : undefined;
};

/**
 * Retrieves a `@layer` rule with layers ordered according to the specified sequence.
 * Layers listed in `order` are placed first, followed by any remaining layers in original order.
 *
 * @param {Root}     root   The PostCSS root containing CSS rules.
 * @param {string[]} layers The list of all layer names present in the CSS.
 * @param {string[]} order  The preferred order in which layers should be organized.
 *
 * @returns {void}
 */
export const addOrderLayer = (root, layers, order) => {
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

	addIndentNode(orderLayer);
	root.prepend(orderLayer);
};
