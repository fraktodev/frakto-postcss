import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import postcss from 'postcss';
import pc from 'picocolors';
import fraktoPostCSS from '../index.mjs';

const baseDir = './tests';
const getSuites = async () => {
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
};

const pathToFileURL = (p) => new URL(`file://${path.resolve(p).replace(/\\/g, '/')}`);

const loadConfig = async (configPath) => {
  if (!fsSync.existsSync(configPath)) return {};
  try {
    const fileUrl = pathToFileURL(configPath).href;
    const config = await import(fileUrl);
    return config?.default || config;
  } catch (err) {
    console.error(pc.red(`Error loading config from ${configPath}`), err);
    return {};
  }
};

const findInputFile = async (dir) => {
  const files = await fs.readdir(dir);
  const candidates = ['input.scss', 'input.sass', 'input.css'];
  for (const name of candidates) {
    if (files.includes(name)) {
      return { path: path.join(dir, name), ext: path.extname(name) };
    }
  }
  return null;
};

const compileIfNeeded = async (filePath, ext) => {
  if (ext === '.css') return await fs.readFile(filePath, 'utf8');
  try {
    return execSync(`sass ${filePath}`, { encoding: 'utf8' });
  } catch (err) {
    console.error(pc.red(`Sass compilation failed for ${filePath}`), err.message);
    return '';
  }
};

const loadTests = async () => {
  const suites = await getSuites();

  for (const suite of suites) {
    const dir = path.join(baseDir, suite);
    const configPath = path.join(dir, 'config.mjs');
    const inputFile = await findInputFile(dir);

    if (!inputFile) {
      console.warn(pc.yellow(`Skipping suite "${suite}" because no input file was found.`));
      continue;
    }

    const files = await fs.readdir(dir);
    const outputFiles = files.filter((f) => /^output(?:\.[\w-]+)?\.css$/.test(f));
    if (outputFiles.length === 0) {
      console.warn(pc.yellow(`Skipping suite "${suite}" because no output files were found.`));
      continue;
    }

    console.log(
      `${pc.green('Suite loaded:')} ${pc.cyan(suite)} ${pc.magenta(
        `(${outputFiles.length} output${outputFiles.length !== 1 ? 's' : ''})`
      )}`
    );

    const config = await loadConfig(configPath);
    const input = await compileIfNeeded(inputFile.path, inputFile.ext);
    const tests = [];

    for (const outputFile of outputFiles) {
      const outputPath = path.join(dir, outputFile);
      const expected = (await fs.readFile(outputPath, 'utf8')).trim();
      const suffix = outputFile === 'output.css' ? '' : ` (${outputFile.replace(/^output\.|\..*$/g, '')})`;
      const localOptions = config.outputs?.[outputFile] || config.options || {};

      tests.push({ suffix, input, expected, options: localOptions });
    }

    describe(`Frakto | ${suite}`, () => {
      for (const { suffix, input, expected, options } of tests) {
        it(`should match output${suffix}`, async () => {
          const result = await postcss([fraktoPostCSS(options)]).process(input, { from: undefined });
          expect(result.css.trim()).toBe(expected.trim());
        });
      }
    });
  }
};

await loadTests();
