// Dependencies
import { resolveOptions } from './utils/options.mjs';
import { getClasses, getTags, resolveSource, purgeNodes } from './utils/purge.mjs';
import {
	formatNode,
	getLayers,
	createOrphansLayer,
	createOrderLayer,
	groupAndSortMediaQueries
} from './utils/formatter.mjs';

/**
 * Retrieves the configured PostCSS plugin instance for processing Frakto layers and purging rules.
 *
 * Applies layer reordering, orphan grouping, media query normalization,
 * and optional purging based on configured tag and class safe lists.
 *
 * @param {Object} opts  Optional. Configuration overrides for the plugin. Default: {}.
 *
 * @returns {Object}
 */
const fraktoPostCSS = (opts = {}) => {
	const options = resolveOptions(opts);

	return {
		postcssPlugin: 'frakto-postcss',
		Once(root) {
			let source, tagWhiteList, classWhiteList;
			const layersPrinted = [];
			const layers = getLayers(root);
			const orphanLayer = createOrphansLayer(root, options.orphansLayerName);

			// Only resolve and whitelist tags/classes if purging is enabled
			if (options.purge === true) {
				source = resolveSource(options.includePaths, options.excludePaths, options.files);
				tagWhiteList = [...getTags(source), ...options.tagSafeList];
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
						purgeNodes(layer, tagWhiteList, classWhiteList);
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
