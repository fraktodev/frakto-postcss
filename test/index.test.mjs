import pc from 'picocolors';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const arg = process.argv[2];

const file = arg ? join(__dirname, `${arg}.test.mjs`) : null;

if (file) {
	try {
		await import(file);
	} catch (err) {
		console.error(pc.red(`Could not find the test "${arg}"`));
		process.exit(1);
	}
} else {
	const glob = await import('fast-glob');
	const entries = await glob.glob(join(__dirname, '*.test.mjs'));

	for (const entry of entries) {
		await import(entry);
	}
}
