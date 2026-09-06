// Dependencies
import postcss from 'postcss';
import postcssDiscardComments from 'postcss-discard-comments';
import postcssReduceInitial from 'postcss-reduce-initial';
import postcssMinifyGradients from 'postcss-minify-gradients';
import postcssSvgo from 'postcss-svgo';
import postcssReduceTransforms from 'postcss-reduce-transforms';
import postcssConvertValues from 'postcss-convert-values';
import postcssCalc from 'postcss-calc';
import postcssColormin from 'postcss-colormin';
import postcssOrderedValues from 'postcss-ordered-values';
import postcssMinifySelectors from 'postcss-minify-selectors';
import postcssMinifyParams from 'postcss-minify-params';
import postcssNormalizeCharset from 'postcss-normalize-charset';
import postcssMinifyFontValues from 'postcss-minify-font-values';
import postcssNormalizeUrl from 'postcss-normalize-url';
import postcssMergeLonghand from 'postcss-merge-longhand';
import postcssDiscardDuplicates from 'postcss-discard-duplicates';
import postcssDiscardOverridden from 'postcss-discard-overridden';
import postcssNormalizeRepeatStyle from 'postcss-normalize-repeat-style';
import postcssMergeRules from 'postcss-merge-rules';
import postcssDiscardEmpty from 'postcss-discard-empty';
import postcssUniqueSelectors from 'postcss-unique-selectors';
import postcssNormalizeString from 'postcss-normalize-string';
import postcssNormalizePositions from 'postcss-normalize-positions';
import postcssNormalizeWhitespace from 'postcss-normalize-whitespace';
import postcssNormalizeUnicode from 'postcss-normalize-unicode';
import postcssNormalizeDisplayValues from 'postcss-normalize-display-values';
import postcssNormalizeTimingFunctions from 'postcss-normalize-timing-functions';

export const optimizeCss = () => {
  return [
    postcssNormalizeCharset(),
    postcssDiscardComments(),
    postcssNormalizeString(),
    postcssNormalizeUnicode(),
    postcssNormalizeUrl(),
    postcssNormalizeDisplayValues()
  ];
};

/**
 * Minifies CSS using official PostCSS optimization plugins.
 *
 * @param {string} css Raw CSS string to minify.
 *
 * @returns {Promise<string>}
 */
export const minifyCss = async (css) => {
  const plugins = [
    // OPTIMEZE FUNTIONS TIPO URL, ATTRm COUNTER
    //postcssNormalizeCharset(), // SI
    //postcssDiscardComments(), // SI
    postcssNormalizeString(), // SI RENOMBRAR A QUOTES Y SOLO REEMPLAZAR POR COMILLAS SIMPLES
    //postcssNormalizeUnicode(), // DESCARTADO
    postcssNormalizeUrl(), // FUSIONAR EN QUOTES
    // postcssNormalizeDisplayValues(), DESCARTADO
    // postcssNormalizePositions(), // SI Y FUSIONAR EN BG
    postcssNormalizeTimingFunctions(), // SI y FUSIONAR EN ANIMATION
    //postcssNormalizeRepeatStyle(), // SI Y FUSIONAR BG
    postcssNormalizeWhitespace(), // SI WHITESPACE
    postcssReduceInitial(), // SI
    postcssReduceTransforms(), // SI TRANSFORM
    postcssConvertValues(),
    postcssMinifyGradients(), // SI GRADIENTS
    postcssMinifySelectors(), // SI FUSIONAR EN MINIFY
    postcssMinifyParams(), // SI FUSIONAR EN MINIFY
    //postcssMinifyFontValues(), // SI FUSIONAR EN MINIFY
    postcssOrderedValues(), // SI
    postcssColormin(), // SI
    postcssCalc(), // USAR DIRECTO
    postcssSvgo(), // SI FUSIONAR EN BG
    postcssMergeLonghand(), // SI
    postcssDiscardDuplicates(), // SI A PURGE
    postcssDiscardOverridden(),
    postcssMergeRules(), // SI
    postcssDiscardEmpty(), // SI A PURGE
    postcssUniqueSelectors() // SI
  ];

  const result = await postcss(plugins).process(css, { from: undefined });
  return result.css;
};
