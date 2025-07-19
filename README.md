<div align="center">
  <a href="https://frakto.dev/">
    <img src="https://frakto.dev/dist/img/logos/frakto-iso.png" alt="Bootstrap logo" width="150" height="173">
  </a>
  <br>
	<strong>Frakto Postcss</strong>
  <p><em>Fragment. Optimize. Reconstruct.</em></p>
  <img src="https://img.shields.io/badge/version-1.0.0--beta-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/npm-%5E10.0.0-blue.svg?logo=npm&logoColor=white" alt="npm">
  <img src="https://img.shields.io/badge/PostCSS-%5E8.0.0-blue.svg?logo=postcss&logoColor=white" alt="PostCSS">
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

- [Installation](#installation)
- [Configuration Options](#configuration-options)
- [Usage](#usage)
- [Expected Output](#expected-output)
- [Purge Mode](#purge-mode)
- [Contributing](#contributing)
- [License](#license)

## Installation

You can install Frakto PostCSS via your favorite package manager:

```bash
npm install @frakto/postcss --save-dev
```

Frakto PostCSS is designed to work with PostCSS v8 or higher. Please make sure PostCSS is installed in your project.

```bash
npm install postcss --save-dev
```

## Configuration Options

`frakto-postcss` provides several configuration options to customize its behavior. You can pass them via plugin options or by creating a `frakto.config.mjs` file in your project root.

If a config file is present, inline plugin options will be ignored.

### Available Options

| Option             | Type               | Default     | Description                                                                                                                                                                                                |
| ------------------ | ------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `purge`            | `boolean`          | `true`      | Enables purging of unused CSS classes and tags.                                                                                                                                                            |
| `tagSafeList`      | `string[]`         | `[]`        | List of tag names to preserve during purging.                                                                                                                                                              |
| `classSafeList`    | `string[]`         | `[]`        | List of class names to preserve during purging. Supports both literal strings and RegExp patterns. For example: `['btn-primary', /^m[trblxy]?-?\d$/]` will preserve `.btn-primary`, `.mt-1`, `.mx-4`, etc. |
| `includePaths`     | `string\|string[]` | `'.'`       | Folders (relative to `process.cwd()`) to scan for source files.                                                                                                                                            |
| `excludePaths`     | `string\|string[]` | See below   | Folders to exclude during scanning.                                                                                                                                                                        |
| `files`            | `string\|string[]` | `['html']`  | File extensions (without dot) to include in the scan. Only the following extensions are valid: `html`, `astro`, `jsx`, `tsx`. Invalid ones will be ignored with a warning.                                 |
| `orphansLayerName` | `string`           | `'orphans'` | Name of the layer used to group orphaned CSS rules.                                                                                                                                                        |
| `layersOrder`      | `string[]`         | See below   | Custom order in which CSS layers will be printed.                                                                                                                                                          |

#### Default `excludePaths`

```js
[
  '.git',
  '.tmp',
  '.next',
  '.cache',
  '.turbo',
  '.vercel',
  '.vscode',
  '.ds_store',
  'tmp',
  'test',
  'tests',
  'vendor',
  'node_modules'
];
```

#### Default `layersOrder`

```js
[
  'theme',
  'reset',
  'base',
  'layout.containers',
  'layout.grid',
  'layout.flex',
  'layout.shortcuts',
  'shortcuts',
  'orphans'
];
```

You can override this order to suit your project's structure.

## Usage

Frakto PostCSS is a drop-in PostCSS plugin. Once installed and configured, you can integrate it into any PostCSS processing pipeline.

### Basic Example (ESM)

```js
import postcss from 'postcss';
import fraktoPostCSS from '@frakto/postcss';

const css = `/* your CSS content */`;

const result = await postcss([
  fraktoPostCSS({
    purge: true,
    includePaths: 'src',
    excludePaths: ['node_modules'],
    files: ['html', 'astro']
  })
]).process(css);

console.log(result.css);
```

### CommonJS Example

```js
const postcss = require('postcss');
const fraktoPostCSS = require('@frakto/postcss');

const css = `/* your CSS content */`;

postcss([
  fraktoPostCSS({
    purge: true,
    includePaths: 'src',
    excludePaths: ['node_modules'],
    files: ['html', 'astro']
  })
])
  .process(css)
  .then((result) => {
    console.log(result.css);
  });
```

### Using frakto.config.mjs

Frakto PostCSS can auto-load settings from a `frakto.config.mjs` file. When this file is present, options passed directly to the plugin will be ignored.

```js
// frakto.config.mjs
export default {
  purge: true,
  includePaths: ['src'],
  excludePaths: ['node_modules'],
  files: ['html', 'astro']
};
```

Then in your PostCSS setup:

#### Example: `postcss.config.mjs`

```js
import fraktoPostCSS from '@frakto/postcss';

export default {
  plugins: [fraktoPostCSS()]
};
```

For more control, see the [Configuration Options](#configuration-options) section.

## Expected Output

Given the following input:

```css
@layer reset {
  * {
    margin: 0;
    padding: 0;
  }
}

@layer base {
  h1 {
    font-size: 2rem;
  }
}

.btn {
  padding: 1rem;
  background: blue;
}
```

After processing with `frakto-postcss`, the output will be:

```css
@layer reset, base, shortcuts;
@layer reset {
  * {
    margin: 0;
    padding: 0;
  }
}
@layer base {
  h1 {
    font-size: 2rem;
  }
}
@layer shortcuts {
  .btn {
    padding: 1rem;
    background: blue;
  }
}
```

Layers are reordered, orphan rules are grouped under a dedicated layer, and formatting is normalized.

## Purge Mode

When `purge` is enabled in your configuration, Frakto PostCSS will analyze your source files (HTML, Astro, JSX, TSX) and remove any unused CSS selectors (tags and classes).

### How it works:

- Parses your files and extracts all HTML tags and values inside `class="..."` attributes.
- Then, it checks every layer (except `theme` and `reset`) and removes CSS rules that don't match any of the extracted tags or classes.

### Safe lists:

You can define `tagSafeList` and `classSafeList` in your config to prevent specific selectors from being removed, even if they’re not found in your source files.

### Example

```js
export default {
  purge: true,
  tagSafeList: ['a', 'span', 'table'],
  classSafeList: ['ghost', 'admin-only']
};
```

This helps you safely keep utility classes or elements added dynamically by JavaScript or frameworks.

> **Tip:** Use the safe lists to avoid removing styles for modals, dynamic components, or server-rendered templates.  
> If you're using Frakto UI, most dynamic components are already safe listed internally, so you typically won’t need to handle that manually.

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
