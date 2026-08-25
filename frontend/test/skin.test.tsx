// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { I18nProvider } from '../src/i18n';
import { Block } from '../src/components/Block';
import { Placeholder, Redacted } from '../src/components/Redacted';
import { Logo } from '../src/components/Logo';

describe('redaction', () => {
    it('renders the content at full size and covers it, rather than replacing it', () => {
        // The whole direction rests on this: a secret occupies exactly the
        // space it will occupy when it is told. If the cover replaced the
        // content, the reveal would reflow and the wipe would be a lie.
        const { container } = render(
            <Redacted open={false} legend="SEALED">
                <span className="secret">the answer</span>
            </Redacted>,
        );

        expect(container.querySelector('.secret')!.textContent).toBe('the answer');
        expect(container.querySelector('.redact__cover')).not.toBeNull();
        expect(container.querySelector('.redact')!.getAttribute('data-open')).toBe('false');
    });

    it('keeps the same cover element once open, so the wipe has something to animate', () => {
        const { container, rerender } = render(
            <Redacted open={false}>
                <span />
            </Redacted>,
        );
        const cover = container.querySelector('.redact__cover');

        rerender(
            <Redacted open>
                <span />
            </Redacted>,
        );

        expect(container.querySelector('.redact')!.getAttribute('data-open')).toBe('true');
        // Same node: React reuses it, so `clip-path` transitions instead of the
        // bar being unmounted and the reveal snapping.
        expect(container.querySelector('.redact__cover')).toBe(cover);
    });

    it('keeps the cover out of the accessibility tree — it is paint, not content', () => {
        const { container } = render(
            <Redacted open={false} legend="SEALED" endLegend="OPENS ON THE LAST DONE">
                <span />
            </Redacted>,
        );
        expect(container.querySelector('.redact__cover')!.getAttribute('aria-hidden')).toBe('true');
    });

    it('holds a sealed row open with geometry rather than with the secret', () => {
        // Where the content has genuinely not been sent, the space is held by a
        // placeholder. The alternative — shipping the payload and hiding it in
        // CSS — would put the secret in the DOM of every listener.
        const { container } = render(<Placeholder width="9ch" />);
        const held = container.querySelector('.placeholder') as HTMLElement;
        expect(held.style.width).toBe('9ch');
        expect(held.textContent).toBe('');
        expect(held.getAttribute('aria-hidden')).toBe('true');
    });
});

describe('block', () => {
    it('is a legend and the thing itself, with no frame around it', () => {
        const { container } = render(
            <I18nProvider>
                <Block label="Setlist" count="3/8">
                    <span className="body">body</span>
                </Block>
            </I18nProvider>,
        );

        const label = container.querySelector('.label')!;
        expect(label.textContent).toContain('Setlist');
        expect(label.querySelector('.label__count')!.textContent).toBe('3/8');
        expect(container.querySelector('.body')).not.toBeNull();
        // The window chrome is gone: no title bar, no bordered frame.
        expect(container.querySelector('.win, .win__bar')).toBeNull();
    });

    it('omits the legend entirely when the body announces itself', () => {
        const { container } = render(
            <I18nProvider>
                <Block>
                    <span />
                </Block>
            </I18nProvider>,
        );
        expect(container.querySelector('.label')).toBeNull();
    });
});

describe('logo', () => {
    it('is the name itself, with no drawn mark beside it', () => {
        const { container } = render(<Logo />);
        expect(container.querySelector('svg')).toBeNull();
        expect(container.querySelector('.logo')!.textContent).toBe('Secret DJ');
    });

    it('carries the name as real text, so it is selectable and readable', () => {
        const { container } = render(<Logo size="hero" />);
        const logo = container.querySelector('.logo')!;
        expect(logo.className).toContain('logo--hero');
        expect(logo.querySelector('em')!.textContent).toBe('DJ');
    });

    it('keeps the word break in the text but out of the mark', () => {
        // The two halves are separated visually by the interpunct alone. The
        // space is still in the DOM — the name has to read and copy as two
        // words — but it is zero-width, because a tracked space rendered on
        // one side of the dot only, and the mark read as "SECRET ·DJ".
        const { container } = render(<Logo />);
        const logo = container.querySelector('.logo')!;

        expect(logo.textContent).toBe('Secret DJ');
        const gap = logo.querySelector('.logo__space')!;
        expect(gap.textContent).toBe(' ');
        // Nothing but the space lives in it; it is spacing, not content.
        expect(gap.children).toHaveLength(0);
    });
});
