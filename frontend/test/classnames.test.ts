import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every class a component asks for must exist in the stylesheets.
 *
 * This exists because of a real bug: `.lcd` was renamed to `.matrix` and three
 * screens kept asking for `.lcd`. The class silently did nothing, those panels
 * lost their dark background, and phosphor-coloured text ended up on light
 * chrome — invisible. Nothing failed; it just looked broken.
 */
const SRC = new URL('../src', import.meta.url).pathname;

function walk(dir: string): string[] {
    return readdirSync(dir).flatMap(entry => {
        const path = join(dir, entry);
        return statSync(path).isDirectory() ? walk(path) : [path];
    });
}

const files = walk(SRC);

const css = files
    .filter(path => path.endsWith('.css'))
    .map(path => readFileSync(path, 'utf8'))
    .join('\n');

/** Class selectors defined anywhere in the stylesheets. */
const defined = new Set([...css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(match => match[1]));

/** Classes referenced from JSX, including the halves of template literals. */
function usedClasses(source: string): string[] {
    const out: string[] = [];
    for (const [, quoted, templated] of source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
        out.push(...(quoted ?? templated ?? '').replace(/\$\{[^}]*\}/g, ' ').split(/\s+/));
    }
    // Literal class strings inside interpolations, e.g. ` ? ' is-active' : ''`.
    for (const [, value] of source.matchAll(/'\s?(is-[\w-]+|[\w-]+__[\w-]+|[\w-]+--[\w-]+)'/g)) {
        out.push(value);
    }
    return (
        out
            .filter(Boolean)
            // A fragment ending in a separator is the literal half of an
            // interpolated name (`dot--` from `dot--${connection}`); the whole
            // name only exists at runtime, so there is nothing to check.
            .filter(name => !/(--|__|-)$/.test(name))
    );
}

describe('class names', () => {
    it('are all defined in the stylesheets', () => {
        const missing = new Map<string, string[]>();

        for (const path of files.filter(p => p.endsWith('.tsx'))) {
            for (const name of usedClasses(readFileSync(path, 'utf8'))) {
                if (defined.has(name)) continue;
                const where = path.slice(SRC.length + 1);
                missing.set(name, [...(missing.get(name) ?? []), where]);
            }
        }

        expect(
            Object.fromEntries(missing),
            'these classes are used by a component but styled nowhere',
        ).toEqual({});
    });

    it('found a meaningful number of classes to check', () => {
        // Guards the guard: a broken regex would make this pass vacuously.
        expect(defined.size).toBeGreaterThan(80);
    });
});
