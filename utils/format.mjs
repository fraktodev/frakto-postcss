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
export const indent = (node, initialIndent = '') => {
  const tab = '\t';
  const line = '\n';

  // Flatten multiple selectors into one line
  if (node.type === 'rule' && node.selectors && node.selectors.length > 1) {
    node.selector = node.selectors.join(', ');
  }

  // Apply initial indent
  node.raws.before = line + initialIndent;

  // Recursively indent child nodes
  if (node.nodes && Array.isArray(node.nodes)) {
    const childIndent = initialIndent + tab;

    node.nodes.forEach((child) => {
      child.raws.before = line + childIndent;

      // Normalize declarations spacing (key: value)
      if (child.type === 'decl' && child.raws.between != null) {
        child.raws.between = ': ';
      }

      // Recurse into children
      if (child.nodes && child.nodes.length > 0) {
        indent(child, childIndent);
      }
    });

    // Line break before closing bracket
    node.raws.after = line + initialIndent;
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
export const getOrphansLayer = (root, name) => {
  const orphanLayer = atRule({
    type: 'atrule',
    name: 'layer',
    params: name
  });

  const candidates = [];
  let hasContent = false;

  root.each((node) => {
    if (
      node.type === 'rule' ||
      node.type === 'decl' ||
      (node.type === 'atrule' && node.name !== 'layer') ||
      (node.type === 'comment' && !node.text.trim().startsWith('!') && !node.text.trim().startsWith('#'))
    ) {
      candidates.push(node);
    }
  });

  for (const node of candidates) {
    node.remove();
    orphanLayer.append(node);
    hasContent = true;
  }

  return hasContent ? orphanLayer : undefined;
};

/**
 * Retrieves a `@layer` rule with layers ordered according to the specified sequence.
 * Layers listed in `order` are placed first, followed by any remaining layers in original order.
 *
 * @param {string[]} layers The list of all layer names present in the CSS.
 * @param {string[]} order  The preferred order in which layers should be organized.
 *
 * @returns {AtRule|undefined}
 */
export const getOrderLayer = (layers, order) => {
  if (layers.length <= 1) {
    return undefined;
  }

  // prettier-ignore
  const orderedLayers = [
		...order.filter((name) => layers.includes(name)),
		...layers.filter((name) => !order.includes(name))
	];

  return atRule({
    type: 'atrule',
    name: 'layer',
    parent: undefined,
    params: orderedLayers.join(', ')
  });
};

/**
 * Retrieves a single charset atRule is at the top of the root. If not, moves the first one there.
 *
 * @param {Root} root The PostCSS root containing CSS rules.
 *
 * @returns {AtRule|undefined}
 */
export const getRootCharset = (root) => {
  const first = root.first;

  if (!first || first.type !== 'atrule' || first.name !== 'charset') {
    return atRule({
      type: 'atrule',
      name: 'charset',
      parent: undefined,
      params: `"UTF-8"`
    });
  }

  return undefined;
};
