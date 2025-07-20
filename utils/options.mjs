// Dependencies
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

// Defaults
const DEFAULTS = {
	removeComments: 'non-bang',
	addCharset: true,
	minify: true,
	purge: true,
	tagSafeList: [],
	idSafeList: [],
	classSafeList: [],
	includePaths: '.',
	excludePaths: [
		'.git',
		'.vscode',
		'.next',
		'.cache',
		'.tmp',
		'.vercel',
		'tmp',
		'test',
		'tests',
		'vendor',
		'node_modules'
	],
	files: ['html', 'astro', 'jsx', 'tsx'],
	orphansLayerName: 'orphans',
	layersOrder: [
		'theme',
		'reset',
		'base',
		'layout.containers',
		'layout.grid',
		'layout.flex',
		'layout.shortcuts',
		'shortcuts',
		'orphans'
	]
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
	const configPath = path.resolve(process.cwd(), 'frakto.config.mjs');

	let options = { ...DEFAULTS, ...ctx };

	if (fs.existsSync(configPath)) {
		const require = createRequire(import.meta.url);
		const rawConfig = require(configPath);

		options = { ...DEFAULTS, ...(rawConfig.default ?? rawConfig) };
	}

	if (mode === 'development') {
		options.purge = false;
		options.minify = false;
	}

	return options;
};
