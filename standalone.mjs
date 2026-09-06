import postcss from 'postcss';
import fraktoPlugin from './index.mjs';

/**
 * Processes raw CSS using Frakto PostCSS plugin.
 *
 * @param {string} css     Raw CSS input.
 * @param {Object} options Configuration options passed to the plugin.
 *
 * @returns {Promise<string>}
 */
export const processCss = async (css, options = {}) => {
	const result = await postcss([fraktoPlugin(options)]).process(css, {
		from: undefined
	});
	return result.css;
};
