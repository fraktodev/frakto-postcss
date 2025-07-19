import postcss from 'postcss';
import fraktoPostCSS from '../index.mjs';
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Frakto PostCSS Plugin', () => {
	it('should apply all options and purge correctly', async () => {
		const input = fs.readFileSync(path.resolve('test/fixtures/input.css'), 'utf8');

		const result = await postcss([
			fraktoPostCSS({
				purge: true,
				includePaths: 'test/fixtures',
				excludePaths: 'node_modules',
				files: ['html'],
				tagSafeList: ['h1'],
				classSafeList: ['card'],
				layersOrder: ['theme', 'reset', 'base', 'layout.grid', 'shortcuts', 'orphans'],
				orphansLayerName: 'orphans'
			})
		]).process(input, { from: undefined });

		const output = result.css;

		expect(output).toContain('h1');
		expect(output).not.toMatch(/^\s*p\s*\{/m);
		expect(output).not.toContain('.grid');
		expect(output).not.toContain('.unlayered');
		expect(output).toContain('.xs\\:fs-1');
	});
});
