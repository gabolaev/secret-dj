// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { I18nProvider } from '../src/i18n';
import { Window } from '../src/components/Window';
import { Logo, LogoMark } from '../src/components/Logo';

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
    it('is drawn, not typed, so it cannot vanish into a background', () => {
        const { container } = render(<LogoMark size={22} />);
        const svg = container.querySelector('svg')!;
        expect(svg.getAttribute('width')).toBe('22');
        // Platter, grooves, label, spindle, pivot, stylus.
        expect(svg.querySelectorAll('circle').length).toBeGreaterThanOrEqual(5);
        // The tonearm is what makes it read as a deck rather than a disc.
        expect(svg.querySelector('path')).toBeTruthy();
    });

    it('carries its own contrast rather than inheriting text colour alone', () => {
        const { container } = render(<LogoMark />);
        const fills = [...container.querySelectorAll('[fill]')].map(node => node.getAttribute('fill'));
        expect(fills).toContain('#0d1119');
        expect(fills.some(fill => fill?.includes('--accent'))).toBe(true);
    });

    it('is hidden from assistive tech, since the wordmark carries the name', () => {
        const { container } = render(<Logo size={24} />);
        expect(container.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
        expect(container.querySelector('.logo__word')!.textContent).toBe('SecretDJ');
    });
});
