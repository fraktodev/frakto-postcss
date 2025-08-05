<div align="center">
  <a href="https://frakto.dev/">
    <img src="https://frakto.dev/dist/img/logos/frakto-iso.png" alt="Frakto logo" width="150" height="173">
  </a>
  <br>
	<strong>Frakto Postcss</strong>
  <p><em>Fragment. Optimize. Reconstruct.</em></p>
  <img src="https://img.shields.io/badge/version-1.0.0--beta.2-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/npm-%5E10.0.0-blue.svg?logo=npm&logoColor=white" alt="npm">
  <img src="https://img.shields.io/badge/PostCSS-%5E8.0.0-blue.svg?logo=postcss&logoColor=white" alt="PostCSS">
  <img src="https://img.shields.io/badge/JavaScript-ESM-blue.svg?logo=javascript&logoColor=white" alt="JavaScript ESM">
  <img src="https://img.shields.io/badge/License-MIT-brightgreen.svg" alt="License">
  <img src="https://img.shields.io/badge/build-passing-brightgreen.svg" alt="Build Status">
  <img src="https://img.shields.io/badge/Prs-welcome-brightgreen.svg" alt="Contributions welcome">
</div>

---

# Frakto PostCSS

A PostCSS plugin that brings sacred structure and visual clarity to your final CSS output.

It intelligently groups declarations into `@layer` blocks, reorders media queries for optimal performance, and ensures that your styles are both readable and scalable.

More than a formatter, it also features an integrated **purge engine** that removes unused styles from your CSS, reducing bundle size without breaking layout integrity — no external plugins required.

Originally designed to empower the **Frakto UI** framework, it's fully compatible with any modern CSS architecture or design system.

## Table of Contents

- [What does this plugin do?](#what-does-this-plugin-do)
- [Installation](#installation)
- [Options](#options)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## What does this plugin do?

`@frakto/postcss` is an all-in-one PostCSS plugin crafted for modular, optimized, and production-ready CSS. It gives you full control over your styles, removing the clutter and enforcing structure and consistency.

### Main Features

#### Minification

Removes unnecessary whitespace, units, and redundant syntax to generate compact output.

#### Optimization

A set of optional, fine-grained improvements:

- Removes comments intelligently based on your configuration
- Groups and sorts media queries by type and specificity (`min-width` → `max-width` → combined `min`/`max` → `prefers-*` → `print`, etc.)
- Merges background declarations into a shorthand (`background-color`, `background-image`, `background-repeat`, `background-position`)
- Simplifies values like `repeat no-repeat` → `repeat-x`, and `left top` → `0% 0%`
- Merges related `border-*` declarations into shorthands (e.g., `border-width`, `border-style`, `border-color`) including directional and logical variants. Also merges `border-image-*` and logical `border-radius` into compact forms
- Merges multiple `font-*` declarations into a single `font` shorthand when at least two font-related declarations are present

#### Purge

Removes unused selectors by scanning your source files and comparing against a safe list (supports literal values and regular expressions)

#### Layering

Automatically groups all CSS rules into `@layer` blocks (e.g. `theme`, `reset`, `base`, etc.) and adds a layer order rule at the top to enforce cascade precedence.

- Rules outside any layer are moved to a default orphan layer (configurable)
- A `@layer reset, base, layout...` declaration is injected to maintain correct order

## Installation

You can install Frakto PostCSS via your favorite package manager:

```bash
npm install @frakto/postcss --save-dev
```

Frakto PostCSS is designed to work with PostCSS v8 or higher. Please make sure PostCSS is installed in your project.

```bash
npm install postcss --save-dev
```

## Options

`@frakto/postcss` provides several configuration options to customize its behavior. You can pass them via plugin options or by creating a `frakto.config.mjs` file in your project root.

If a config file is present, inline plugin options will be ignored.

### Available Options

#### Top-level Options

| Option     | Type                | Default | Description                                                                                   |
| ---------- | ------------------- | ------- | --------------------------------------------------------------------------------------------- |
| `minify`   | `boolean`           | `true`  | Enables internal CSS minification: trims whitespace, simplifies values, removes units, etc.   |
| `optimize` | `boolean`\|`object` | `true`  | Enables structural optimizations. Set to `true` for defaults, or pass an object to customize. |
| `purge`    | `boolean`\|`object` | `true`  | Enables purging of unused selectors. Set to `true` for defaults, or customize with an object. |
| `layers`   | `object`            | `{}`    | Handles CSS layer order and orphan grouping.                                                  |

#### optimize Options

| Option         | Type                            | Default      | Description                                                                                                                                                                                                                                                                                                                                |
| -------------- | ------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `comments`     | `'none'`\|`'non-bang'`\|`'all'` | `'non-bang'` | Controls comment removal:<br>• `'none'`: preserve all<br>• `'non-bang'`: remove all except `/*!`<br>• `'all'`: remove all comments <br>• If set to `'none'` and `minify` is `true`, `'non-bang'` is used instead.                                                                                                                          |
| `charset`      | `boolean`                       | `true`       | Inserts `@charset "UTF-8"` at the top of the CSS, if not already present.                                                                                                                                                                                                                                                                  |
| `mediaQueries` | `boolean`                       | `true`       | Groups and sorts `@media` rules by type and specificity (e.g. `min-width`, `max-width`, `prefers-*`, `print`, etc.). Queries with identical parameters are merged.                                                                                                                                                                         |
| `background`   | `boolean`                       | `true`       | Merges and simplifies related `background-*` declarations (e.g. `background-repeat`, `background-position`) into a single shorthand.                                                                                                                                                                                                       |
| `border`       | `boolean`                       | `true`       | Merges and simplifies related `border-*` declarations (like `border-width`, `border-style`, `border-color`) into a single shorthand. Also supports directional properties (`border-left`, `border-block`, etc.) as long as all three required sub-properties are present. Extensible to handle `border-image` and `border-radius` as well. |
| `font`         | `boolean`                       | `true`       | Merges and simplifies related `font-*` declarations (`font-family`, `font-size`, `font-weight`, `font-style`, etc.) into a single `font` shorthand. Only applied when at least two font-related declarations are present.                                                                                                                  |

#### purge Options

| Option         | Type                 | Default     | Description                                                                                           |
| -------------- | -------------------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| `safeList`     | `(string\|RegExp)[]` | (see below) | Selectors to keep (e.g. `.title`, `#main`, `/\.combo-\d+/`). Accepts class, ID, or tag (with prefix). |
| `includePaths` | `string[]`           | (see below) | Folders to scan for source files (relative to `process.cwd()`).                                       |
| `excludePaths` | `string[]`           | (see below) | Folders to ignore: `.git`, `node_modules`, `.next`, `test`, etc.                                      |
| `files`        | `string[]`           | (see below) | File types to scan: `html`, `astro`, `jsx`, `tsx`. Others will be ignored with a warning.             |

#### layers Options

| Option        | Type       | Default     | Description                                                  |
| ------------- | ---------- | ----------- | ------------------------------------------------------------ |
| `order`       | `string[]` | (see below) | Defines the print order for CSS layers.                      |
| `orphansName` | `string`   | (see below) | Name of the layer for CSS rules not wrapped in any `@layer`. |

#### Default purge Options

```js
{
  safeList: [],
  includePaths: ['.'],
  excludePaths: ['.git', '.vscode', 'tmp', 'test', 'tests', 'vendor', 'node_modules'],
  sourceFiles: ['html', 'astro', 'jsx', 'tsx']
}
```

#### Default layers Options

```js
{
  orphansName: 'root',
  order: ['theme', 'reset', 'base', 'root']
}
```

You can override this order to suit your project's structure.

## Usage

Frakto PostCSS is a modern PostCSS plugin built entirely on **ES Modules**. It integrates into any PostCSS pipeline using `.mjs` files or a `"type": "module"` setup.

### Basic Usage (ESM)

```js
// postcss-runner.mjs
import postcss from 'postcss';
import fraktoPostCSS from '@frakto/postcss';

const css = `/* your CSS content */`;

const result = await postcss([
  fraktoPostCSS({
    minify: false
    purge: true,
    optimize: true,
  })
]).process(css);

console.log(result.css);
```

### Auto-loading config from `frakto.config.mjs`

Frakto can load options automatically from a config file in your project root.

#### Example: `frakto.config.mjs`

```js
export default {
  minify: false
  purge: true,
  optimize: true,
};
```

If this file is present, any options passed directly to the plugin will be **ignored**.

### In your `postcss.config.mjs`

```js
import fraktoPostCSS from '@frakto/postcss';

export default {
  plugins: [fraktoPostCSS({
    minify: false
    purge: true,
    optimize: true,
  })]
};
```

### Important

This plugin **only works with ESM**. Make sure you:

- Use `.mjs` files
- Or set `"type": "module"` in your `package.json`

CommonJS (`require`) is **not supported**.

## Contributing

Contributions are welcome and encouraged.  
If you'd like to help improve this plugin, please open a pull request or issue.

Make sure to follow our [contributing guidelines](https://github.com/fraktodev/frakto-postcss/blob/main/.github/CONTRIBUTING.md) before submitting any changes.

## License

MIT License — Copyright © 2025 [Frakto](https://github.com/fraktodev/)

## Funding

This project is maintained with love and dedication.  
If you'd like to support its continued development, you can do so here:  
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-%E2%98%95-yellow.svg?style=flat)](https://coff.ee/danybranding)
