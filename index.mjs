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
      let source, whiteList;
      const layers = format.getLayers(root);
      const layersToReinsert = [];
      const layersToOrder = [];
      const orphansLayer = format.getOrphansLayer(root, opts.layers.orphansName, opts.minify);

      // Optimize
      optimize.comments(root, opts.optimize.comments, opts.minify);

      // Insert charset at the top of the root
      if (opts.optimize.charset) {
        purge.charsets(root);
        root.prepend(format.getRootCharset(root));
      }

      // Insert orphan layer into layer map if it exists
      if (orphansLayer) {
        layers.set(opts.layers.orphansName, [orphansLayer]);
      }

      // Exit early if layers are not iterable
      if (!layers || typeof layers.forEach !== 'function') {
        return;
      }

      // Resolve for purge
      if (opts.purge.enabled) {
        source = purge.resolveSource(
          opts.purge.includePaths,
          opts.purge.excludePaths,
          opts.purge.sourceFiles
        );
        whiteList = [
          ...purge.getTags(source),
          ...purge.getIds(source),
          ...purge.getClasses(source),
          ...opts.purge.safeList
        ];
      }

      // Iterate through each layer group and apply transformations
      layers.forEach((layerData, layerName) => {
        layerData.forEach((layer) => {
          // Purge
          purge.charsets(layer);
          if (opts.purge.enabled && !['theme', 'reset'].includes(layerName)) {
            purge.nodes(layer, whiteList);
          }

          // Optimize
          const optimizeSteps = {
            comments: (layer) => optimize.comments(layer, opts.optimize.comments, opts.minify),
            mediaQueries: (layer) => optimize.mediaQueries(layer),
            spacing: (layer) => optimize.spacing(layer),
            font: (layer) => optimize.font(layer),
            listStyle: (layer) => optimize.listStyle(layer),
            background: (layer) => optimize.background(layer),
            border: (layer) => optimize.border(layer),
            outline: (layer) => optimize.outline(layer)
          };
          Object.entries(optimizeSteps).forEach(([key, fn]) => {
            if (opts.optimize[key]) {
              fn(layer);
            }
          });

          // Append layers to maps.
          if (layer.nodes && layer.nodes.length > 0) {
            layersToOrder.push(layerName);
            layersToReinsert.push(layer);
          }
        });
      });

      // Insert order layer into nodesToReinsert map.
      const orderLayer = format.getOrderLayer(layersToOrder, opts.layers.order);
      if (orderLayer) {
        layersToReinsert.unshift(orderLayer);
      }

      // Reinsert layers into the root
      for (const layer of layersToReinsert) {
        format.indent(layer);
        root.nodes.push(layer);
      }
    }
  };
};

fraktoPostCSS.postcss = true;
export default fraktoPostCSS;
