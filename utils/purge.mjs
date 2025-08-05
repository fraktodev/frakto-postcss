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
 * @returns {string|undefined}
 */
export const resolveSource = (includePaths, excludePaths, sourceFiles) => {
  let rawContent = '';

  const validExtensions = ['html', 'astro', 'jsx', 'tsx'];

  const inputExtensions = Array.isArray(sourceFiles) ? sourceFiles : [sourceFiles];
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
  if (typeof content !== 'string') {
    return [];
  }

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
  if (typeof content !== 'string') {
    return [];
  }

  const idRegex = /\bid\s*=\s*["']([^"']+)["']/gi;
  const matches = [...content.matchAll(idRegex)];
  const ids = new Set();

  for (const match of matches) {
    match[1].split(/\s+/).forEach((id) => {
      if (id.trim()) ids.add(`#${id.trim()}`);
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
  if (typeof content !== 'string') {
    return [];
  }

  const classRegex = /\b(?:class|className)\s*=\s*["']([^"']+)["']/gi;
  const matches = [...content.matchAll(classRegex)];
  const classes = new Set();

  for (const match of matches) {
    match[1].split(/\s+/).forEach((cls) => {
      if (cls.trim()) classes.add(`.${cls.trim()}`);
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
 * @param {Node}              layer      The PostCSS layer containing CSS rules
 * @param {(string|RegExp)[]} whiteList  Tags, ids, classes or patterns allowed during purging.
 *
 * @returns {void}
 */
export const nodes = (layer, whiteList) => {
  const globalWhiteList = [':root', '*', 'html', 'body'];
  const mergedWhiteList = [...new Set([...whiteList, ...globalWhiteList])];
  const typesToCheck = ['tag', 'id', 'class', 'universal'];

  // Normalize selector to match against whitelist format
  const normalizeSelector = (type, value) => {
    if (type === 'class') return `.${value}`;
    if (type === 'id') return `#${value}`;
    if (type === 'universal') return '*';
    return value;
  };

  // Check if a selector (string or RegExp) is in the whitelist
  const isWhitelisted = (type, value) =>
    mergedWhiteList.some((safe) => {
      const prefixedValue = normalizeSelector(type, value);
      return typeof safe === 'string'
        ? safe === prefixedValue
        : safe instanceof RegExp && safe.test(prefixedValue);
    });

  // Recursively validate a selector by walking its nodes
  const validateSelector = (selector) => {
    let isValid = false;

    selector.walk((node) => {
      // Skip >, +, ~, etc.
      if (node.type === 'combinator') {
        return;
      }

      // Handle pseudo selectors with nested sub-selectors (e.g., :is(), :not())
      if (node.type === 'pseudo' && Array.isArray(node.nodes) && node.nodes.length > 0) {
        const subSelectors = node.nodes.filter((n) => n.type === 'selector');
        const anyValid = subSelectors.some((subSelector) => validateSelector(subSelector));

        if (anyValid) {
          isValid = true;
        } else {
          isValid = false;
        }

        return false;
      }

      // Skip non-nested pseudo classes like :hover, :first-child, etc.
      if (node.type === 'pseudo') {
        return;
      }

      // Validate tag, id, class, universal
      if (typesToCheck.includes(node.type)) {
        isValid = isWhitelisted(node.type, node.value);
      }
    });

    return isValid;
  };

  // Walk through each CSS rule inside the layer
  layer.walkRules((rule) => {
    if (!rule.selector) return;

    const keepSelectors = [];

    try {
      // Parse complex selector and check each part individually
      selectorParser((selectors) => {
        selectors.each((selector) => {
          if (validateSelector(selector)) {
            // Normalize and remove leading/trailing whitespace
            keepSelectors.push(selector.toString().trim());
          }
        });
      }).processSync(rule.selector);

      // If none of the selectors are valid, remove the rule entirely
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
