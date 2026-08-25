// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { I18nProvider } from '../src/i18n';
import { Window } from '../src/components/Window';
import { Logo } from '../src/components/Logo';

describe('window', () => {
    it('puts the caption and any actions in the header strip', () => {
        const { container } = render(
            <I18nProvider>
                <Window title="Playlist" actions={<span className="stat">3</span>}>
                    body
                </Window>
            </I18nProvider>,
        );
        const bar = container.querySelector('.win__bar')!;
        expect(bar.querySelector('.win__title')!.textContent).toBe('Playlist');
        expect(bar.querySelector('.stat')!.textContent).toBe('3');
    });

    it('lets a flush window supply its own body padding', () => {
        const { container } = render(
            <I18nProvider>
                <Window title="X" flush>
                    <span />
                </Window>
            </I18nProvider>,
        );
        expect((container.querySelector('.win__body') as HTMLElement).style.padding).toBe('0px');
    });
});

describe('logo', () => {
    it('is the name itself, with no drawn mark beside it', () => {
        // There used to be a record-deck drawn in SVG here. At bar size it read
        // as a smudge, and beside an interface made entirely of engraved
        // uppercase labels it was the one illustrated thing on screen.
        const { container } = render(<Logo />);
        expect(container.querySelector('svg')).toBeNull();
        expect(container.querySelector('.logo')!.textContent).toBe('Secret DJ');
    });

    it('carries the name as real text, so it is selectable and readable', () => {
        const { container } = render(<Logo size="hero" />);
        const logo = container.querySelector('.logo')!;
        expect(logo.className).toContain('logo--hero');
        // The second word is the one coloured thing in it.
        expect(logo.querySelector('em')!.textContent).toBe('DJ');
    });
});
