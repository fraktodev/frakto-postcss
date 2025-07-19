// Dependencies
import { resolveOptions } from './utils/options.mjs';
import {
	formatNode,
	getLayers,
	createOrphansLayer,
	createOrderLayer,
	groupAndSortMediaQueries
} from './utils/format.mjs';
import { getTags, getIds, getClasses, resolveSource, purgeNodes } from './utils/purge.mjs';

/**
 * Retrieves the configured PostCSS plugin instance for processing Frakto layers and purging rules.
 * Applies layer reordering, orphan grouping, media query normalization,
 * and optional minify and purging based on configured tag and class safe lists.
 *
 * @param {Object} opts Optional. Configuration overrides for the plugin. Default: {}.
 * @param {string} mode Optional. Execution mode (e.g., 'development' or 'production'). Default: process.env.NODE_ENV or 'production'.
 *
 * @returns {Object}
 */
const fraktoPostCSS = (opts = {}, mode = process.env.NODE_ENV || 'production') => {
	const options = resolveOptions(opts, mode);

	return {
		postcssPlugin: 'frakto-postcss',
		Once(root) {
			let source, tagWhiteList, idWhiteList, classWhiteList;
			const layersPrinted = [];
			const layers = getLayers(root);
			const orphanLayer = createOrphansLayer(root, options.orphansLayerName);

			// Only resolve and whitelist tags/classes if purging is enabled
			if (options.purge === true) {
				source = resolveSource(options.includePaths, options.excludePaths, options.files);
				tagWhiteList = [...getTags(source), ...options.tagSafeList];
				idWhiteList = [...getIds(source), ...options.idSafeList];
				classWhiteList = [...getClasses(source), ...options.classSafeList];
			}

			// Insert orphan layer into layer map if it exists
			if (orphanLayer) {
				layers.set(options.orphansLayerName, [orphanLayer]);
			}

			// Exit early if layers are not iterable
			if (!layers || typeof layers.forEach !== 'function') {
				return;
			}

			// Iterate through each layer group and apply transformations
			layers.forEach((layerData, layerName) => {
				layerData.forEach((layer) => {
					// Purge rules from layers except reset and theme
					if (options.purge && !['reset', 'theme'].includes(layerName)) {
						purgeNodes(layer, tagWhiteList, idWhiteList, classWhiteList);
					}

					// Normalize and sort media queries within each layer
					// and append media queries back into the layer
					const mediaQueries = groupAndSortMediaQueries(layer);
					mediaQueries.forEach((media) => {
						layer.append(media);
					});

					// Append formatted layer to root if it has content
					if (layer.nodes && layer.nodes.length > 0) {
						layersPrinted.push(layerName);
						formatNode(layer);
						root.append(layer);
					}
				});
			});

			// Generate and prepend layer order metadata
			const orderLayer = createOrderLayer(layersPrinted, options.layersOrder);
			if (orderLayer) {
				root.prepend(orderLayer);
				formatNode(orderLayer);
			}
		}
	};
};

// Export
export default fraktoPostCSS;
