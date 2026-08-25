import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The type system has three faces and six steps, and each face has a job:
 *
 * - **Archivo** (`--font-ui`) — everything you read.
 * - **IBM Plex Mono** (`--font-num`) — every number, label and annotation. Mono
 *   is earned here: the product's payoff is an arithmetic receipt, and tabular
 *   figures are why `27 → 4.5` reads at four feet.
 * - **Instrument Serif** (`--font-disp`) — display only, one or two per screen,
 *   never in a table. It does not cover Cyrillic, so RU falls back to Archivo —
 *   which is why nothing load-bearing may depend on it.
 *
 * A fourth face, or a hardcoded size, is how a type system stops being one.
 */
const theme = readFileSync(new URL('../src/styles/theme.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/styles/app.css', import.meta.url), 'utf8');

function scale(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [, name, value] of theme.matchAll(/--(fs-[a-z-]+):\s*(\d+)px/g)) {
        out[name] = Number(value);
    }
    return out;
}

describe('type scale', () => {
    it('defines every step, and only those steps', () => {
        expect(Object.keys(scale()).sort()).toEqual([
            'fs-base',
            'fs-display',
            'fs-fig',
            'fs-lead',
            'fs-micro',
            'fs-name',
        ]);
    });

    it('never drops below a legible floor', () => {
        for (const [name, size] of Object.entries(scale())) {
            expect(size, name).toBeGreaterThanOrEqual(10);
        }
    });

    it('keeps the reading steps clearly apart, so each has an obvious job', () => {
        const sizes = scale();
        expect(sizes['fs-base']).toBeGreaterThan(sizes['fs-micro']);
        expect(sizes['fs-lead']).toBeGreaterThan(sizes['fs-base']);
        expect(sizes['fs-fig']).toBeGreaterThan(sizes['fs-lead']);
        // The name is the largest thing on the screen at the moment it lands.
        expect(sizes['fs-name']).toBeGreaterThan(sizes['fs-fig'] * 1.5);
    });

    it('sets the product in exactly the three declared faces', () => {
        const families = [...(theme + app).matchAll(/font-family:\s*([^;]+);/g)].map(match =>
            match[1].trim(),
        );
        for (const family of families) {
            expect(family, 'a fourth face crept in').toMatch(
                /var\(--font-(ui|num|disp)\)|inherit|^'Archivo'|^'IBM Plex Mono'|^'Instrument Serif'/,
            );
        }
        // The three roots are declared once each, in the theme.
        for (const name of ['--font-ui', '--font-num', '--font-disp']) {
            expect(theme).toContain(`${name}:`);
        }
    });

    it('has no rounded corners outside the two the design allows', () => {
        // Radius zero everywhere. The outer frame and the room-code chip are the
        // only exceptions, and they are tokens so they can be counted.
        const radii = [...(theme + app).matchAll(/border-radius:\s*([^;]+);/g)].map(m => m[1].trim());
        for (const radius of radii) {
            expect(radius, 'a stray corner radius').toMatch(/var\(--r-(frame|chip)\)|^0$/);
        }
    });

    it('has no shadows or gradients anywhere: depth is a hairline or an ink fill', () => {
        const shadows = [...app.matchAll(/box-shadow:\s*([^;]+);/g)].map(m => m[1].trim());
        // The one survivor is the keyline holding the chosen rating key off the
        // inked keys beside it — an inset ring, not an elevation.
        expect(shadows).toEqual(['inset 0 0 0 2px var(--paper)']);
        expect(theme).not.toContain('box-shadow');
        expect(theme + app).not.toContain('linear-gradient(to');
        expect(theme + app).not.toContain('radial-gradient');
    });

    it('keeps the theme on the scale, bar two constants that are not type steps', () => {
        // 12px: the tracked uppercase mono legend on a key. It sits between the
        // annotation step and the body step because tracking makes it measure
        // wider than either — it is a legend, not a size in the reading scale.
        //
        // 16px: form inputs. Below 16px mobile Safari zooms the page on focus,
        // which is a layout bug wearing a typographic costume.
        const strays = [...theme.matchAll(/font-size:\s*(\d+)px/g)].map(m => m[1]);
        expect(strays.sort()).toEqual(['12', '16', '16']);
    });
});

describe('the wordmark', () => {
    it('separates the halves with the interpunct alone, symmetrically', () => {
        // The interpunct's own margins were always symmetric; what broke the
        // mark was the literal space beside it, which contributed its advance
        // *and* a letter-spacing step to the left of the dot and nothing to
        // the right. The space element has to stay zero-width for the two
        // sides to match.
        const space = app.match(/\.logo__space\s*\{([^}]*)\}/);
        expect(space, 'the zero-width word break is gone').not.toBeNull();
        expect(space![1]).toMatch(/font-size:\s*0\s*;/);

        const dot = app.match(/\.logo em::before\s*\{([^}]*)\}/)![1];
        const margin = dot.match(/margin:\s*([^;]+);/)![1].trim().split(/\s+/);
        // A one- or two-value margin is symmetric by definition; three or four
        // values could quietly put a different gap on each side of the dot.
        expect(margin.length).toBeLessThanOrEqual(2);
    });
});

describe('the join column', () => {
    it('keeps the sheet and the footnote under it on one text column', () => {
        // The footnote is a centred *sibling* of the sheet, not a child, so it
        // only lines up if it repeats both the width cap and the side padding.
        // Match the width alone — which is what shipped — and every line of it
        // starts one padding step left of the form above it.
        const block = (selector: string) => {
            const match = app.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`));
            if (!match) throw new Error(`missing rule ${selector}`);
            return match[1];
        };
        const declaration = (body: string, property: string) =>
            body.match(new RegExp(`(?:^|[\\s;])${property}:\\s*([^;]+);`))?.[1].trim();

        const sheet = block('.join__sheet');
        const services = block('.join__services');

        expect(declaration(services, 'max-width')).toBe(declaration(sheet, 'max-width'));
        // The sheet's shorthand is `<top> <side> <bottom>`; the footnote only
        // needs the side to agree.
        const side = declaration(sheet, 'padding')!.split(/\s+/)[1];
        expect(declaration(services, 'padding')).toBe(`0 ${side}`);
    });
});

describe('overlays', () => {
    it('never sets display on a dialog outside its open state', () => {
        // A closed `<dialog>` is hidden by the UA's own
        // `dialog:not([open]) { display: none }`. Any unconditional `display`
        // in author CSS wins over it, and the symptom is not subtle: the rules
        // sheet paints over the app from first render and the close button
        // does nothing, because `close()` only clears the attribute.
        //
        // jsdom never loads this stylesheet, so no render test can catch it.
        // Guard the rule itself.
        // The dialog itself is the selector whose final compound is `.sheet` —
        // `.sheet__body` and `.sheet .x` are ordinary descendants.
        const isDialog = (selector: string) =>
            selector
                .split(',')
                .some(part => /(^|[\s>+~])\.sheet(\[[^\]]*\]|:[a-z-]+)*\s*$/.test(part.trim()));

        const blocks = [...app.matchAll(/([^{}]+)\{([^}]*)\}/g)];
        const styled = blocks.filter(
            ([, selector, body]) => isDialog(selector) && /(^|[\s;])display\s*:/.test(body),
        );

        // It must be styled *somewhere*, or this guard is watching nothing.
        expect(styled.length).toBeGreaterThan(0);
        for (const [, selector] of styled) {
            expect(selector, 'a dialog styled with display outside [open]').toContain('[open]');
        }
    });
});

describe('motion', () => {
    it('animates covers and nothing else', () => {
        // "If something is moving, a secret is being opened." Everything else is
        // allowed to change background on hover, and that is the whole budget.
        const transitions = [...(theme + app).matchAll(/transition:\s*([^;]+);/g)].map(m => m[1]);
        for (const transition of transitions) {
            expect(transition, 'a second moving part').toMatch(
                /^(clip-path|background|background-color|color|border-color)\b/,
            );
        }
    });

    it('uses one easing and the declared durations', () => {
        expect(theme).toContain('--ease: cubic-bezier(0.2, 0.8, 0.2, 1)');
        expect(theme).toContain('--dur-wipe: 420ms');
        const easings = [...(theme + app).matchAll(/cubic-bezier\([^)]*\)/g)].map(m => m[0]);
        for (const easing of easings) {
            expect(easing).toBe('cubic-bezier(0.2, 0.8, 0.2, 1)');
        }
    });

    it('cuts instead of wiping under reduced motion', () => {
        expect(theme).toContain('prefers-reduced-motion: reduce');
        expect(theme).toMatch(/transition-duration:\s*1ms\s*!important/);
    });
});
