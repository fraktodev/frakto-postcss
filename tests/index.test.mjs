import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import postcss from 'postcss';
import pc from 'picocolors';
import frakto from '../index.mjs';

const baseDir = './tests';
const getSuites = async () => {
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
};

const loadTests = async () => {
  const suites = await getSuites();

  for (const suite of suites) {
    const dir = path.join(baseDir, suite);
    const inputPath = path.join(dir, 'input.css');
    const configPath = path.join(dir, 'config.json');

    if (!fsSync.existsSync(inputPath)) {
      console.warn(pc.yellow(`Skipping suite "${suite}" because the input file is missing.`));
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

    const config = fsSync.existsSync(configPath) ? JSON.parse(await fs.readFile(configPath, 'utf8')) : {};
    const input = await fs.readFile(inputPath, 'utf8');
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
          const result = await postcss([frakto(options)]).process(input, { from: undefined });
          expect(result.css.trim()).toBe(expected);
        });
      }
    });
  }
};

await loadTests();
