// Dependencies
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

// Defaults
const DEFAULTS = {
	purge: true,
	tagSafeList: [],
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
 * Retrieves the resolved plugin options based on default values and user configuration.
 *
 * If a `frakto.config.mjs` file is detected at the project root, its values override the defaults.
 * In that case, any options passed inline to the plugin are ignored completely.
 *
 * @param {Object} inlineOptions  Optional. Options provided directly when invoking the plugin.
 *                                Ignored if a config file is present. Default: {}.
 *
 * @returns {Object}
 */
export const resolveOptions = (inlineOptions = {}) => {
	const configPath = path.resolve(process.cwd(), 'frakto.config.mjs');

	if (fs.existsSync(configPath)) {
		const require = createRequire(import.meta.url);
		const rawConfig = require(configPath);
		const config = rawConfig.default ?? rawConfig;

		return {
			...DEFAULTS,
			...config
		};
	}

	return {
		...DEFAULTS,
		...inlineOptions
	};
};
