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
  const warnIgnore =
    pc.bold(pc.yellow('FraktoPostCSS: ')) +
    pc.yellow('The following extensions are not valid and will be ignored:\n') +
    invalidExtensions.map((e) => pc.bold(pc.yellow(`  - ${e}`))).join('\n');

  // Clean and classify each extension
  for (const extRaw of inputExtensions) {
    if (typeof extRaw !== 'string') continue;

    const ext = extRaw.trim().replace(/^\./, '');
    if (validExtensions.includes(ext)) normalizedExtensions.push(`.${ext}`);
    else invalidExtensions.push(`.${ext}`);
  }

  // Display warning if there are invalid extensions
  if (invalidExtensions.length > 0) console.warn(warnIgnore);

  const includes = Array.isArray(includePaths) ? includePaths : [includePaths];
  const excludes = Array.isArray(excludePaths) ? excludePaths : [excludePaths];

  const isValidExtension = (filePath) => normalizedExtensions.includes(path.extname(filePath));
  const shouldExclude = (relPath) => excludes.some((excluded) => relPath.split(path.sep).includes(excluded));

  // Recursive file walker: reads content of valid files, skipping excluded paths
  const walk = (dir) => {
    let collected = [];

    for (const entry of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      const relPath = path.relative(process.cwd(), fullPath);

      if (shouldExclude(relPath)) continue;
      if (fs.statSync(fullPath).isDirectory()) collected = collected.concat(walk(fullPath));
      else if (isValidExtension(fullPath)) collected.push(fs.readFileSync(fullPath, 'utf8'));
    }

    return collected;
  };

  // Traverse all include paths and accumulate their contents
  for (const includePath of includes) {
    const baseDir = path.resolve(process.cwd(), includePath);
    const warnNoPath =
      pc.bold(pc.yellow('FraktoPostCSS: ')) +
      pc.yellow('Include path does not exist: ') +
      pc.bold(pc.yellow(includePath));

    if (fs.existsSync(baseDir)) rawContent += walk(baseDir).join('\n');
    else console.warn(warnNoPath);
  }

  // Final fallback: if no content was collected, warn the user
  if (!rawContent.trim()) {
    const warnNoFound =
      pc.bold(pc.yellow('FraktoPostCSS: ')) +
      pc.yellow('No source files were found matching the specified patterns. ') +
      pc.yellow('Please verify that the paths or glob patterns provided are correct.');

    console.warn(warnNoFound);
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
  const tags = [];
  const matches = [...content.matchAll(tagRegex)];

  for (const match of matches) {
    tags.push(match[1].toLowerCase());
  }

  return [...new Set(tags)];
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
  const ids = [];

  for (const match of matches) {
    match[1].split(/\s+/).forEach((id) => {
      if (id.trim()) ids.push(`#${id.trim()}`);
    });
  }

  return [...new Set(ids)];
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
  const classes = [];

  for (const match of matches) {
    match[1].split(/\s+/).forEach((cls) => {
      if (cls.trim()) classes.push(`.${cls.trim()}`);
    });
  }

  return [...new Set(classes)];
};

/**
 * Optimizes comments based on plugin options.
 *
 * @param {Object}  node   The PostCSS root or node containing CSS rules.
 * @param {string}  remove The remove comments option. Accepts 'all', 'non-bang', or false.
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
  } else if (remove === false && minify === true) {
    shouldRun = true;
    preserveImportant = true;
  }

  if (!shouldRun) return;

  // Iterate through comments
  node.walkComments((comment) => {
    const isImportant = comment.text.trim().startsWith('!');
    if (preserveImportant && isImportant) return;
    comment.remove();
  });
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
 * Purges rules and selectors not found in safe lists.
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
  const validSelectors = [];
  const global = ['*', 'html', 'body'];

  global.reverse().forEach((el) => whiteList.includes(el) || whiteList.unshift(el));

  // Normalize selector to match against whitelist format
  const normalizeSelector = (type, value) => {
    if (type === 'class') return `.${value}`;
    if (type === 'id') return `#${value}`;
    if (type === 'universal') return '*';
    if (type === 'pseudo') return value.startsWith(':') ? value : `:${value}`;
    return value;
  };

  // Check if a selector (string or RegExp) is in the whitelist
  const isWhitelisted = (type, value) => {
    const prefixedValue = normalizeSelector(type, value);
    for (let i = 0; i < whiteList.length; i++) {
      const safe = whiteList[i];
      if (typeof safe === 'string' && safe === prefixedValue) return true;
      if (safe instanceof RegExp && safe.test(prefixedValue)) return true;
    }
    return false;
  };

  // Analyzes each selector and pushes to validSelectors
  const validateSelector = (selector) => {
    // 1. Direct pseudo without a preceding selector (e.g., :root, :focus, ::-webkit-...)
    if (selector.nodes.length === 1 && selector.nodes[0].type === 'pseudo') {
      const pseudo = selector.nodes[0];
      const pseudoName = normalizeSelector('pseudo', pseudo.value);
      if (!isWhitelisted('pseudo', pseudo.value)) {
        validSelectors.push(pseudoName);
      }
      return;
    }

    // 2. Compound pseudo (e.g., input:hover, .foo:focus)
    if (selector.nodes.length === 2 && selector.nodes[1].type === 'pseudo') {
      const base = selector.nodes[0];
      if (isWhitelisted(base.type, base.value)) {
        validSelectors.push(selector.toString().trim());
      }
      return;
    }

    // 3. Complex selectors: analyze the "final" (last relevant)
    // Look for the last tag, id, class, or universal before any pseudo
    let lastBase = null;
    for (let i = selector.nodes.length - 1; i >= 0; i--) {
      const types = ['tag', 'id', 'class', 'universal'];
      const node = selector.nodes[i];
      if (types.includes(node.type)) {
        lastBase = node;
        break;
      }
    }
    if (lastBase && isWhitelisted(lastBase.type, lastBase.value)) {
      validSelectors.push(selector.toString().trim());
    }
  };

  // Build the extended validSelectors list
  layer.walkRules((rule) => {
    if (!rule.selector) return;
    selectorParser((selectors) => {
      selectors.each((selector) => {
        validateSelector(selector);
      });
    }).processSync(rule.selector);
  });

  console.log(whiteList);

  // Purge the selectors based on the validSelectors list
  layer.walkRules((rule) => {
    if (!rule.selector) return;
    const keepSelectors = [];

    selectorParser((selectors) => {
      selectors.each((selector) => {
        const sel = selector.toString().trim();
        if (validSelectors.includes(sel)) keepSelectors.push(sel);
      });
    }).processSync(rule.selector);

    if (keepSelectors.length === 0) rule.remove();
    else rule.selector = keepSelectors.join(', ');
  });
};
