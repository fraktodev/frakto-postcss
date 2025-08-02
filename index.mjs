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
      const layersPrinted = [];
      const layers = format.getLayers(root);
      const orphansLayer = format.addOrphansLayer(root, opts.orphansLayerName);

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

      // Purge
      purge.charsets(root);

      // Optimize
      optimize.comments(root, opts.removeComments, opts.minify);

      // Iterate through each layer group and apply transformations
      layers.forEach((layerData, layerName) => {
        layerData.forEach((layer) => {
          // Purge
          purge.charsets(layer);
          if (opts.purge && !['reset', 'theme'].includes(layerName)) {
            purge.nodes(layer, tagWhiteList, idWhiteList, classWhiteList);
          }

          // Optimize
          optimize.mediaQueries(layer);
          optimize.comments(layer, opts.removeComments, opts.minify);
          //optimize.quotes(layer);
          optimize.background(layer);

          // Append formatted layer to root if it has content
          if (layer.nodes && layer.nodes.length > 0) {
            layersPrinted.push(layerName);
            format.addIndentNode(layer);
            root.append(layer);
          }
        });
      });

      // Generate and prepend layer order metadata
      format.addOrderLayer(root, layersPrinted, opts.layersOrder);

      // Insert charset at the top of the root
      if (opts.addCharset) {
        optimize.addRootCharset(root);
      }
    }
  };
};

fraktoPostCSS.postcss = true;
export default fraktoPostCSS;
