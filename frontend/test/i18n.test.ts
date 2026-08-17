import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';

/**
 * The message catalogues, checked against the code that uses them.
 *
 * TypeScript already guarantees the locales have the same *shape*. What it
 * cannot see is a key that nothing renders any more — and every redesign has
 * left a few behind, each of which then has to be translated twice for no
 * reason.
 */
const SRC = new URL('../src', import.meta.url).pathname;

function walk(dir: string): string[] {
    return readdirSync(dir).flatMap(entry => {
        const path = join(dir, entry);
        return statSync(path).isDirectory() ? walk(path) : [path];
    });
}

const source = walk(SRC)
    .filter(path => path.endsWith('.tsx') || (path.endsWith('.ts') && !path.includes('/i18n/')))
    .map(path => readFileSync(path, 'utf8'))
    .join('\n');

/** Every `group.leaf` path in the catalogue. */
function paths(object: object, prefix = ''): string[] {
    return Object.entries(object).flatMap(([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        return value && typeof value === 'object' && !Array.isArray(value) && typeof value !== 'function'
            ? paths(value as object, path)
            : [path];
    });
}

describe('message catalogue', () => {
    it('has no keys that nothing renders', () => {
        const unused = paths(en).filter(path => {
            const [group] = path.split('.');
            // Groups indexed dynamically — `t.errors[code]`, `t.awards[id]` —
            // use every leaf by definition.
            if (source.includes(`t.${group}[`)) return false;
            return !source.includes(`t.${path}`);
        });

        expect(unused, 'defined in en.ts and ru.ts but rendered nowhere').toEqual([]);
    });

    it('translates every key rather than echoing English', () => {
        // A copy-paste that never got translated is invisible until a Russian
        // speaker hits that screen.
        const shared = paths(en).filter(path => {
            const read = (o: object) => path.split('.').reduce<unknown>((acc, k) => (acc as never)?.[k], o);
            const a = read(en);
            const b = read(ru);
            if (typeof a !== 'string' || typeof b !== 'string') return false;
            // Brand names and language codes are meant to be identical.
            if (path.startsWith('brand.') || path.startsWith('locale.')) return false;
            return a === b && /[a-zA-Z]{4}/.test(a);
        });

        expect(shared, 'identical in both locales — probably untranslated').toEqual([]);
    });

    it('checked a meaningful number of keys', () => {
        expect(paths(en).length).toBeGreaterThan(90);
    });
});
