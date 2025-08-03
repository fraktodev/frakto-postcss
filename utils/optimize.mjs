// Dependencies
import { atRule, list } from 'postcss';

/**
 * Optimizes strings by enforcing double quotes and removing them when safe.
 * WARNING: Optimization of values is incomplete.
 * Escaped quotes and sequences like \n, \t, \\ may be broken.
 * TODO: Replace with a custom parser that safely tokenizes string content.
 *
 * @param {Node} layer The PostCSS layer containing CSS rules.
 *
 * @returns {void}
 */
export const quotes = (layer) => {
  const hasFunction = (value) => /\b[a-zA-Z-]+\s*\(/.test(value);
  const quotedProps = new Set([
    'content',
    'quotes',
    'font-family',
    'speak-as',
    'voice-family',
    'animation-name',
    'cursor',
    'list-style',
    'counter-reset',
    'counter-increment'
  ]);

  layer.walkDecls((decl) => {
    if (hasFunction(decl.value)) {
      return;
    }

    if (quotedProps.has(decl.prop)) {
      decl.value = normalize(decl.value, 'single');
      return;
    }

    decl.value = decl.value.replace(/['"]/g, '');
  });
};

/**
 * Optimizes and compresses background-related CSS declarations.
 *
 * @param {Node} layer The PostCSS layer containing CSS rules.
 *
 * @returns {void}
 */
export const background = (layer) => {
  // Optimize background-repeat
  layer.walkDecls(/^(background|background-repeat)$/, (decl) => {
    const parts = list.space(decl.value);
    const newParts = [];
    let replaced = false;

    for (let i = 0; i < parts.length; i++) {
      const a = parts[i];
      const b = parts[i + 1];

      if (
        (a === 'repeat' && b === 'no-repeat') ||
        (a === 'no-repeat' && b === 'repeat') ||
        (a === 'repeat' && b === 'repeat') ||
        (a === 'no-repeat' && b === 'no-repeat')
      ) {
        const shorthand = {
          'repeat no-repeat': 'repeat-x',
          'no-repeat repeat': 'repeat-y',
          'repeat repeat': 'repeat',
          'no-repeat no-repeat': 'no-repeat'
        }[`${a} ${b}`];

        newParts.push(shorthand);
        i++;
        replaced = true;
        continue;
      }

      newParts.push(a);
    }

    if (replaced) {
      decl.value = newParts.join(' ');
    }
  });

  // Optimize background-position
  layer.walkDecls(/^(background|background-position)$/, (decl) => {
    const replacements = { left: '0%', center: '50%', right: '100%', top: '0%', bottom: '100%' };
    const parts = list.space(decl.value);
    const newParts = [];
    let replaced = false;

    for (const part of parts) {
      if (part in replacements) {
        newParts.push(replacements[part]);
        replaced = true;
      } else {
        newParts.push(part);
      }
    }

    if (replaced && newParts.length === 1) {
      const original = parts[0];
      if (['left', 'center', 'right'].includes(original)) {
        newParts.push('50%');
      } else if (['top', 'center', 'bottom'].includes(original)) {
        newParts.unshift('50%');
      }
    }

    if (replaced) {
      decl.value = newParts.join(' ');
    }
  });

  // Fuse multiple background-* into background
  layer.walkRules((rule) => {
    const props = ['color', 'image', 'repeat', 'position'];
    const decls = Object.fromEntries(props.map((p) => [p, null]));

    rule.walkDecls(/^background-/, (decl) => {
      const key = decl.prop.replace('background-', '');
      if (props.includes(key)) decls[key] = decl;
    });

    const fusionables = props.filter((p) => decls[p]);
    if (fusionables.length < 2) return;

    const value = fusionables.map((p) => decls[p].value).join(' ');
    const lastDecl = fusionables.map((p) => decls[p]).pop();
    lastDecl.cloneBefore({ prop: 'background', value });
    fusionables.forEach((p) => decls[p].remove());
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
export const mediaQueries = (layer) => {
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
