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
      purge.comments(root, opts.purge.comments, opts.minify);

      // Insert charset at the top of the root
      if (opts.optimize.charset) {
        purge.charsets(root);
        root.prepend(format.getRootCharset(root));
      }

      // Insert orphan layer into layer map if it exists
      if (orphansLayer) {
        layers[opts.layers.orphansName] = [orphansLayer];
      }

      // Exit early if layers are not iterable
      if (Object.keys(layers).length === 0) {
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
      Object.entries(layers).forEach(([layerName, layerData]) => {
        layerData.forEach((layer) => {
          // Frakto processing steps
          const processingSteps = {
            // Purge
            charsets: {
              run: () => purge.charsets(layer),
              enabled: opts.purge.enabled
            },
            comments: {
              run: () => purge.comments(layer, opts.purge.comments, opts.minify),
              enabled: opts.purge.enabled
            },
            nodes: {
              run: () => purge.nodes(layer, whiteList),
              enabled: opts.purge.enabled
            },
            // Optimize
            mediaQueries: {
              run: () => optimize.mediaQueries(layer),
              enabled: opts.optimize.mediaQueries
            },
            /* quotes: {
              run: () => optimize.quotes(layer),
              enabled: opts.optimize.enabled && opts.optimize.quotes
            }, */
            spacing: {
              run: () => optimize.spacing(layer),
              enabled: opts.optimize.spacing
            },
            font: {
              run: () => optimize.font(layer),
              enabled: opts.optimize.font
            },
            listStyle: {
              run: () => optimize.listStyle(layer),
              enabled: opts.optimize.listStyle
            },
            background: {
              run: () => optimize.background(layer),
              enabled: opts.optimize.background
            },
            border: {
              run: () => optimize.border(layer),
              enabled: opts.optimize.border
            },
            outline: {
              run: () => optimize.outline(layer),
              enabled: opts.optimize.outline
            },
            order: {
              run: () => optimize.sortDeclarations(layer, opts.optimize.order),
              enabled: opts.optimize.order
            }
          };
          for (const { run, enabled } of Object.values(processingSteps)) {
            if (enabled) run();
          }

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
