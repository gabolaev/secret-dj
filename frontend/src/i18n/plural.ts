/**
 * Plural helpers.
 *
 * English needs two forms; Russian needs three, chosen by rules that do not map
 * onto "is it 1?" — 2 треков is wrong, 22 трека is right, 25 треков is right
 * again. `Intl.PluralRules` already knows all of this, so each locale's
 * dictionary picks its own forms and no shared "pluralise" abstraction has to
 * pretend the two languages work the same way.
 */
const EN_RULES = new Intl.PluralRules('en-US');
const RU_RULES = new Intl.PluralRules('ru-RU');

/** English: `1 heart` / `2 hearts`. */
export function en2(count: number, one: string, other: string): string {
    return `${count} ${EN_RULES.select(count) === 'one' ? one : other}`;
}

/** Russian: `1 трек` / `2 трека` / `5 треков`. */
export function ru3(count: number, one: string, few: string, many: string): string {
    switch (RU_RULES.select(count)) {
        case 'one':
            return `${count} ${one}`;
        case 'few':
            return `${count} ${few}`;
        default:
            return `${count} ${many}`;
    }
}

/** The bare Russian noun form, for when the number is rendered separately. */
export function ru3Word(count: number, one: string, few: string, many: string): string {
    switch (RU_RULES.select(count)) {
        case 'one':
            return one;
        case 'few':
            return few;
        default:
            return many;
    }
}
