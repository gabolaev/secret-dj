import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const theme = readFileSync(new URL('../src/styles/theme.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/styles/app.css', import.meta.url), 'utf8');
const all = theme + app;

describe('type', () => {
    it('sets everything in one family', () => {
        const families = [...all.matchAll(/font-family:\s*([^;]+);/g)].map(match => match[1].trim());
        for (const family of families) expect(family).toBe('var(--font)');
        expect(theme).toMatch(/--font:\s*'Inter'/);
    });

    it('keeps the scale ascending and above a legible floor', () => {
        const steps = ['xs', 'sm', 'base', 'lg', 'xl', '2xl'].map(step => {
            const match = theme.match(new RegExp(`--fs-${step}:\\s*(\\d+)px`));
            if (!match) throw new Error(`missing --fs-${step}`);
            return Number(match[1]);
        });
        expect(steps[0]).toBeGreaterThanOrEqual(11);
        expect([...steps].sort((a, b) => a - b)).toEqual(steps);
    });
});

describe('shape', () => {
    it('only rounds corners with the radius tokens', () => {
        const radii = [...all.matchAll(/border-radius:\s*([^;]+);/g)].map(match => match[1].trim());
        for (const radius of radii) expect(radius, 'a stray corner radius').toMatch(/^var\(--r(-[a-z]+)?\)$|^50%$/);
    });
});

describe('overlays', () => {
    it('never sets display on a dialog outside its open state', () => {
        // Any unconditional `display` on the dialog overrides the UA's
        // `dialog:not([open]) { display: none }`, and the rules sheet would
        // paint over the app with no way to close it. jsdom never loads this
        // stylesheet, so only a guard on the rule itself can catch it.
        const isDialog = (selector: string) =>
            selector
                .split(',')
                .some(part => /(^|[\s>+~])\.sheet(\[[^\]]*\]|:[a-z-]+)*\s*$/.test(part.trim()));

        const styled = [...app.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter(
            ([, selector, body]) => isDialog(selector) && /(^|[\s;])display\s*:/.test(body),
        );

        expect(styled.length).toBeGreaterThan(0);
        for (const [, selector] of styled) {
            expect(selector, 'a dialog styled with display outside [open]').toContain('[open]');
        }
    });
});

describe('motion', () => {
    it('uses one easing', () => {
        const easings = [...all.matchAll(/cubic-bezier\([^)]*\)/g)].map(match => match[0]);
        expect(new Set(easings)).toEqual(new Set(['cubic-bezier(0.2, 0.8, 0.2, 1)']));
    });

    it('stands still under reduced motion', () => {
        expect(theme).toContain('prefers-reduced-motion: reduce');
        expect(theme).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
        expect(theme).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
    });
});
