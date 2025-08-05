// Dependencies
import { atRule, list } from 'postcss';

/**
 * Optimizes comments based on plugin options.
 *
 * @param {Object}  node   The PostCSS root or node containing CSS rules.
 * @param {string}  remove The remove comments option. Accepts 'all', 'non-bang', or 'none'.
 * @param {boolean} minify The minify option. If true, it may affect comment removal behavior.
 *
 * @returns {void}
 */
export const comments = (node, remove, minify) => {
  let shouldRun = false;
  let preserveImportant = false;

  if (remove === 'all') {
    shouldRun = true;
    preserveImportant = false;
  } else if (remove === 'non-bang') {
    shouldRun = true;
    preserveImportant = true;
  } else if (remove === 'none' && minify === true) {
    shouldRun = true;
    preserveImportant = true;
  }

  if (!shouldRun) return;

  node.walkComments((comment) => {
    const isImportant = comment.text.trim().startsWith('!');
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
export const mediaQueries = (layer) => {
  const mediaMap = new Map();

  // Agrupar por parámetros
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

  // Nueva lógica de orden
  const getMediaGroupAndWeight = (param) => {
    const normalized = param.replace(/\s+/g, '');
    const weights = [
      { pattern: /prefers-color-scheme/, weight: 10 },
      { pattern: /prefers-contrast/, weight: 20 },
      { pattern: /prefers-reduced-motion/, weight: 30 },
      { pattern: /prefers-reduced-transparency/, weight: 40 },
      { pattern: /prefers-reduced-data/, weight: 50 },
      { pattern: /hover/, weight: 60 },
      { pattern: /pointer/, weight: 70 },
      { pattern: /orientation/, weight: 80 },
      { pattern: /resolution/, weight: 90 },
      { pattern: /print/, weight: 100 }
    ];

    if (/^\(min-(width|height):/.test(normalized)) {
      return { group: 1, weight: extractNumeric(param) };
    }
    if (/^\(max-(width|height):/.test(normalized)) {
      return { group: 2, weight: extractNumeric(param) };
    }
    if (/\(min-(width|height):.+?\)\s*and\s*\(max-(width|height):/.test(param)) {
      return { group: 3, weight: extractNumeric(param) };
    }
    if (/^(only\s+)?screen\s+and/i.test(param)) {
      return { group: 4, weight: extractNumeric(param) };
    }
    if (/^all\s+and/i.test(param)) {
      return { group: 5, weight: extractNumeric(param) };
    }
    if (/prefers-/.test(param) || /hover|pointer|orientation|resolution|print/.test(param)) {
      for (const { pattern, weight } of weights) {
        if (pattern.test(param)) {
          return { group: 6, weight };
        }
      }
      return { group: 6, weight: 999 };
    }
    return { group: 7, weight: 0 };
  };

  const extractNumeric = (param) => {
    const matches = [...param.matchAll(/(\d+\.?\d*)(px|em|rem)?/g)];
    if (!matches.length) return 0;

    return matches.reduce((sum, [val, unit]) => {
      const num = parseFloat(val);
      if (unit === 'em' || unit === 'rem') return sum + num * 16;
      return sum + num;
    }, 0);
  };

  [...mediaMap.entries()]
    .sort(([a], [b]) => {
      const gA = getMediaGroupAndWeight(a);
      const gB = getMediaGroupAndWeight(b);
      return gA.group - gB.group || gA.weight - gB.weight;
    })
    .forEach(([, node]) => {
      layer.append(node);
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
 * Optimizes and fuses border-related declarations into shorthand.
 *
 * @param {Node} layer The PostCSS layer to process.
 *
 * @returns {void}
 */
export const border = (layer) => {
  const BASE_PROPS = ['width', 'style', 'color'];
  const IMAGE_PROPS = ['source', 'slice', 'width', 'outset', 'repeat'];
  const PHYSICAL_RADIUS_PROPS = [
    'top-left-radius',
    'top-right-radius',
    'bottom-right-radius',
    'bottom-left-radius'
  ];
  const DIRECTIONS = [
    '',
    'top',
    'right',
    'bottom',
    'left',
    'inline',
    'inline-start',
    'inline-end',
    'block',
    'block-start',
    'block-end'
  ];

  layer.walkRules((rule) => {
    // Phase 1: Merge border width + style + color
    DIRECTIONS.forEach((dir) => {
      const prefix = dir ? `border-${dir}` : 'border';
      const decls = {};
      const toRemove = [];

      rule.walkDecls(new RegExp(`^${prefix}-(width|style|color)$`), (decl) => {
        const key = decl.prop.replace(`${prefix}-`, '');
        if (BASE_PROPS.includes(key)) {
          decls[key] = decl;
          toRemove.push(decl);
        }
      });

      if (BASE_PROPS.every((p) => decls[p])) {
        const value = `${decls.width.value} ${decls.style.value} ${decls.color.value}`;
        decls.color.cloneBefore({ prop: prefix, value });
        toRemove.forEach((d) => d.remove());
      }
    });

    // Phase 2: Merge border-image
    const imageDecls = {};
    const toRemoveImage = [];

    rule.walkDecls(/^border-image-(source|slice|width|outset|repeat)$/, (decl) => {
      const subProp = decl.prop.replace('border-image-', '');
      if (IMAGE_PROPS.includes(subProp)) {
        imageDecls[subProp] = decl;
        toRemoveImage.push(decl);
      }
    });

    if (Object.keys(imageDecls).length >= 2) {
      const ordered = IMAGE_PROPS.map((key) => imageDecls[key]?.value).filter(Boolean);
      const value = ordered.join(' ');
      toRemoveImage.at(-1).cloneBefore({ prop: 'border-image', value });
      toRemoveImage.forEach((d) => d.remove());
    }

    // Phase 3: Merge physical border-radius only
    const radiusDecls = [];
    rule.walkDecls(/^border-(top|bottom)-(left|right)-radius$/, (decl) => {
      const logicalName = decl.prop.replace('border-', '');
      if (PHYSICAL_RADIUS_PROPS.includes(logicalName)) {
        radiusDecls.push(decl);
      }
    });

    if (radiusDecls.length === 4) {
      const top = `${radiusDecls[0].value} ${radiusDecls[1].value}`;
      const bottom = `${radiusDecls[3].value} ${radiusDecls[2].value}`;
      const value = `${top} / ${bottom}`;
      radiusDecls.at(-1).cloneBefore({ prop: 'border-radius', value });
      radiusDecls.forEach((d) => d.remove());
    }
  });
};

/**
 * Optimizes and fuses font-related declarations into shorthand.
 *
 * @param {Node} layer The PostCSS layer to process.
 *
 * @returns {void}
 */
export const font = (layer) => {
  const FONT_PROPS = [
    'font-style',
    'font-variant',
    'font-weight',
    'font-stretch',
    'font-size',
    'line-height',
    'font-family'
  ];

  layer.walkRules((rule) => {
    const decls = {};
    const toRemove = [];

    rule.walkDecls(/^font(-(style|variant|weight|stretch|size|family)|line-height)?$/, (decl) => {
      if (FONT_PROPS.includes(decl.prop)) {
        decls[decl.prop] = decl;
        toRemove.push(decl);
      }
    });

    // Ensure minimum required properties for valid shorthand
    if (!decls['font-size'] || !decls['font-family']) return;

    // Build value in proper order
    const parts = [];
    if (decls['font-style']) parts.push(decls['font-style'].value);
    if (decls['font-variant']) parts.push(decls['font-variant'].value);
    if (decls['font-weight']) parts.push(decls['font-weight'].value);
    if (decls['font-stretch']) parts.push(decls['font-stretch'].value);

    let size = decls['font-size'].value;
    if (decls['line-height']) {
      size += `/${decls['line-height'].value}`;
    }
    parts.push(size);
    parts.push(decls['font-family'].value);

    // Insert shorthand before last declaration (typically font-family)
    decls['font-family'].cloneBefore({
      prop: 'font',
      value: parts.join(' ')
    });

    toRemove.forEach((d) => d.remove());
  });
};

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
