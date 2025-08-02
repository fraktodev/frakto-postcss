import postcss from 'postcss';
import { describe, it, expect } from 'vitest';
import { background } from '../utils/optimize.mjs';

const run = async (input) => {
  const result = await postcss([background]).process(input, { from: undefined });
  return result.css.trim();
};

describe('Optimize css background', () => {
  it('should convert repeat no-repeat to repeat-x', async () => {
    const input = `.a { background-repeat: repeat no-repeat; }`;
    const output = `.a { background-repeat: repeat-x; }`;
    expect(await run(input)).toBe(output);
  });

  it('should convert no-repeat repeat to repeat-y', async () => {
    const input = `.a { background-repeat: no-repeat repeat; }`;
    const output = `.a { background-repeat: repeat-y; }`;
    expect(await run(input)).toBe(output);
  });

  it('should convert repeat repeat to repeat', async () => {
    const input = `.a { background-repeat: repeat repeat; }`;
    const output = `.a { background-repeat: repeat; }`;
    expect(await run(input)).toBe(output);
  });

  it('should convert no-repeat no-repeat to no-repeat', async () => {
    const input = `.a { background-repeat: no-repeat no-repeat; }`;
    const output = `.a { background-repeat: no-repeat; }`;
    expect(await run(input)).toBe(output);
  });

  it('should normalize left top to 0% 0%', async () => {
    const input = `.a { background-position: left top; }`;
    const output = `.a { background-position: 0% 0%; }`;
    expect(await run(input)).toBe(output);
  });

  it('should infer 50% from left only', async () => {
    const input = `.a { background-position: left; }`;
    const output = `.a { background-position: 0% 50%; }`;
    expect(await run(input)).toBe(output);
  });

  it('should infer 50% from bottom only', async () => {
    const input = `.a { background-position: bottom; }`;
    const output = `.a { background-position: 50% 100%; }`;
    expect(await run(input)).toBe(output);
  });

  it('should convert background shorthand with repeat and position', async () => {
    const input = `.a { background: url(x.png) repeat no-repeat left top; }`;
    const output = `.a { background: url(x.png) repeat-x 0% 0%; }`;
    expect(await run(input)).toBe(output);
  });

  it('should fuse background-image and background-repeat', async () => {
    const input = `.a { background-image: url(x.png); background-repeat: repeat no-repeat; }`;
    const output = `.a { background: url(x.png) repeat-x; }`;
    expect(await run(input)).toBe(output);
  });

  it('should fuse background-color and background-position', async () => {
    const input = `.a { background-color: red; background-position: left top; }`;
    const output = `.a { background: red 0% 0%; }`;
    expect(await run(input)).toBe(output);
  });

  it('should fuse all background-* into one background', async () => {
    const input = `.a { background-color: red; background-image: url(x.png); background-repeat: repeat no-repeat; background-position: left top; }`;
    const output = `.a { background: red url(x.png) repeat-x 0% 0%; }`;
    expect(await run(input)).toBe(output);
  });

  it('should not fuse if less than two fusionable props', async () => {
    const input = `.a { background-color: red; }`;
    const output = `.a { background-color: red; }`;
    expect(await run(input)).toBe(output);
  });
});
