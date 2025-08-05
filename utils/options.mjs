// Dependencies
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

// Defaults
const DEFAULTS_OPTIMIZE = {
  comments: 'non-bang', // all, none, non-bang
  charset: true,
  mediaQueries: true,
  background: true,
  border: true,
  font: true
};

const DEFAULTS_PURGE = {
  safeList: [],
  includePaths: ['.'],
  excludePaths: ['.git', '.vscode', 'tmp', 'test', 'tests', 'vendor', 'node_modules'],
  sourceFiles: ['html', 'astro', 'jsx', 'tsx']
};

const DEFAULTS_LAYERS = {
  orphansName: 'root',
  order: ['theme', 'reset', 'base', 'root']
};

/**
 * Inverts a default config object by disabling or emptying all values based on type.
 *
 * @param {string} type     The type of config to invert.
 * @param {Object} defaults The default configuration object to transform.
 *
 * @returns {Object}
 */
const invertDefaults = (type, defaults) => {
  const result = {};

  for (const key in defaults) {
    if (type === 'optimize') {
      result[key] = key === 'comments' ? 'none' : false;
    } else if (type === 'purge') {
      result[key] = Array.isArray(defaults[key]) ? [] : '';
    }
  }

  return result;
};

/**
 * Retrieves the final plugin options by merging defaults, inline settings,
 * optional configuration file, and mode-based enforcement.
 *
 * @param {Object} ctx  Inline options passed directly to the plugin. Default: {}.
 * @param {string} mode Optional. Build mode affecting purge and minify behavior. Accepts: 'development' or 'production'. Default: 'production'.
 *
 * @returns {Object}
 */
export const resolve = (ctx, mode = 'production') => {
  let userConfig = ctx;
  const configPath = path.resolve(process.cwd(), 'frakto.config.mjs');

  if (fs.existsSync(configPath)) {
    const require = createRequire(import.meta.url);
    const rawConfig = require(configPath);
    userConfig = rawConfig.default ?? rawConfig;
  }

  const merged = {
    // Minify resolver
    minify: (() => {
      const user = userConfig?.minify;

      if (user == null) return true;
      return user;
    })(),

    // Optimize resolver
    optimize: (() => {
      const user = userConfig?.optimize;

      if (user === false) return invertDefaults('optimize', DEFAULTS_OPTIMIZE);
      if (user === true || user == null) return { ...DEFAULTS_OPTIMIZE };
      return { ...DEFAULTS_OPTIMIZE, ...user };
    })(),

    // Purge resolver
    purge: (() => {
      const user = userConfig?.purge;

      if (user === false) return { enabled: false, ...invertDefaults('purge', DEFAULTS_PURGE) };
      if (user === true || user == null) return { enabled: true, ...DEFAULTS_PURGE };
      return { enabled: true, ...DEFAULTS_PURGE, ...user };
    })(),

    // Layers resolver
    layers: {
      ...DEFAULTS_LAYERS,
      ...userConfig?.layers
    }
  };

  if (mode === 'development') {
    merged.minify = false;
    merged.purge = { enabled: false, ...invertDefaults('purge', DEFAULTS_PURGE) };
  }

  return merged;
};
