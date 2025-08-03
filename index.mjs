// Dependencies
import * as options from './utils/options.mjs';
import * as format from './utils/format.mjs';
import * as optimize from './utils/optimize.mjs';
import * as purge from './utils/purge.mjs';

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
const fraktoPostCSS = (ctx = {}, mode = process.env.NODE_ENV || 'production') => {
  const opts = options.resolve(ctx, mode);

  return {
    postcssPlugin: 'frakto-postcss',
    Once(root) {
      let source, tagWhiteList, idWhiteList, classWhiteList;
      const layersToReinsert = [];
      const layersPrinted = [];
      const layers = format.getLayers(root);
      const orphansLayer = format.getOrphansLayer(root, opts.orphansLayerName, opts.minify);

      // Purge
      purge.comments(root, opts.removeComments, opts.minify);
      purge.charsets(root);

      // Insert orphan layer into layer map if it exists
      if (orphansLayer) {
        layers.set(opts.orphansLayerName, [orphansLayer]);
      }

      // Exit early if layers are not iterable
      if (!layers || typeof layers.forEach !== 'function') {
        return;
      }

      // Only resolve if purging is enabled
      if (opts.purge === true) {
        source = purge.resolveSource(opts.includePaths, opts.excludePaths, opts.files);
        tagWhiteList = [...purge.getTags(source), ...opts.tagSafeList];
        idWhiteList = [...purge.getIds(source), ...opts.idSafeList];
        classWhiteList = [...purge.getClasses(source), ...opts.classSafeList];
      }

      // Iterate through each layer group and apply transformations
      layers.forEach((layerData, layerName) => {
        layerData.forEach((layer) => {
          // Purge
          purge.comments(layer, opts.removeComments, opts.minify);
          purge.charsets(layer);
          if (opts.purge && !['theme', 'reset'].includes(layerName)) {
            purge.nodes(layer, tagWhiteList, idWhiteList, classWhiteList);
          }

          // Optimize
          optimize.mediaQueries(layer);
          //optimize.quotes(layer);
          optimize.background(layer);

          // Append layers to maps.
          if (layer.nodes && layer.nodes.length > 0) {
            layersPrinted.push(layerName);
            layersToReinsert.push(layer);
          }
        });
      });

      // Insert order layer into nodesToReinsert map.
      const orderLayer = format.getOrderLayer(layersPrinted, opts.layersOrder);
      if (orderLayer) {
        layersToReinsert.unshift(orderLayer);
      }

      // Reinsert layers into the root
      for (const layer of layersToReinsert) {
        format.indent(layer);
        root.nodes.push(layer);
      }

      // Insert charset at the top of the root
      const charset = format.getRootCharset(root);
      if (opts.addCharset && charset) {
        root.prepend(charset);
      }
    }
  };
};

fraktoPostCSS.postcss = true;
export default fraktoPostCSS;
