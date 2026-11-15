// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { I18nProvider } from '../src/i18n';
import { Block } from '../src/components/Block';
import { Logo } from '../src/components/Logo';

describe('block', () => {
    it('is a heading, an optional count, and the content', () => {
        const { container } = render(
            <I18nProvider>
                <Block label="Setlist" count="3/8">
                    <span className="body">body</span>
                </Block>
            </I18nProvider>,
        );

        expect(container.querySelector('.block__title')!.textContent).toBe('Setlist');
        expect(container.querySelector('.block__aside')!.textContent).toBe('3/8');
        expect(container.querySelector('.body')).not.toBeNull();
    });

    it('omits the heading when there is no label', () => {
        const { container } = render(
            <I18nProvider>
                <Block>
                    <span />
                </Block>
            </I18nProvider>,
        );
        expect(container.querySelector('.block__head')).toBeNull();
    });
});

describe('logo', () => {
    it('is the name as real text, so it reads and copies as two words', () => {
        const { container } = render(<Logo size="hero" />);
        const logo = container.querySelector('.logo')!;
        expect(logo.textContent).toBe('Secret DJ');
        expect(logo.className).toContain('logo--hero');
        expect(logo.querySelector('em')!.textContent).toBe('DJ');
        expect(container.querySelector('svg')).toBeNull();
    });
});
