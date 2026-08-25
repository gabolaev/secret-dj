import { useEffect, useState } from 'react';
import { Block } from './Block';
import { useT } from '../i18n';

const VOICES = ['KICK', 'SNARE', 'HAT', 'PERC'] as const;
const STEPS = 8;
/** Eighth notes at 120bpm: fast enough to feel like a machine, slow enough to read. */
const TICK_MS = 250;

/** Something already on the card when you open it: an empty grid is not a toy. */
const SEED: readonly (readonly boolean[])[] = [
    [true, false, false, false, true, false, false, false],
    [false, false, true, false, false, false, true, false],
    [true, false, true, true, true, false, true, false],
    [false, false, false, false, false, true, false, false],
];

/**
 * A drum machine that makes no sound, redrawn as a punched card.
 *
 * It survived the cull. A listening party has three minutes an hour where your
 * hands have nothing to do, and a grid running in time is the best nothing
 * there is.
 *
 * Kept **silent** — eight people are listening to somebody's track and a toy
 * that could talk over it is a bad toy. Kept **local** — no socket, nobody sees
 * your pattern, it is worth no points. And it **never auto-runs**: this is the
 * one moving thing in a design whose rule is that only covers animate, so it
 * only ever moves because somebody pressed RUN. That is also what keeps it
 * honest with `prefers-reduced-motion`, which cannot be respected by something
 * that starts itself.
 *
 * An armed step is the same solid ink as a redaction, so the one thing on
 * screen that is allowed to move is also the only thing on screen with nothing
 * to hide. That is the joke, and it is the whole reason to keep it.
 */
export function DrumMachine() {
    const t = useT();
    const [pattern, setPattern] = useState<boolean[][]>(() => SEED.map(row => [...row]));
    const [running, setRunning] = useState(false);
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (!running) return;
        const interval = window.setInterval(() => setStep(current => (current + 1) % STEPS), TICK_MS);
        return () => window.clearInterval(interval);
    }, [running]);

    const strike = (voice: number, index: number) => {
        // A tick you can feel, where the hardware would have given you one.
        // Silent, brief, and absent on anything that cannot vibrate.
        navigator.vibrate?.(8);
        setPattern(current =>
            current.map((row, r) => (r === voice ? row.map((on, i) => (i === index ? !on : on)) : row)),
        );
    };

    const bar = Math.floor(step / 4) + 1;
    const beat = (step % 4) + 1;

    return (
        <Block label={t.drums.title} count={t.drums.silent} className="dm">
            <div className="dm__card">
                {/* The playhead, as a row of ticks above the card rather than a
                    light inside each cell: a cell is either punched or it is
                    not, and nothing else may change its appearance. */}
                <div className="dm__head" aria-hidden="true">
                    <span className="dm__voice" />
                    {Array.from({ length: STEPS }, (_, index) => (
                        <span key={index} className={`dm__tick${running && step === index ? ' is-now' : ''}`} />
                    ))}
                </div>

                {VOICES.map((voice, row) => (
                    <div className="dm__row" key={voice}>
                        <span className="dm__voice num">{voice}</span>
                        {pattern[row].map((on, index) => (
                            <button
                                key={index}
                                type="button"
                                className={`dm__cell${on ? ' is-on' : ''}`}
                                aria-pressed={on}
                                aria-label={`${voice} ${index + 1}`}
                                onClick={() => strike(row, index)}
                            />
                        ))}
                    </div>
                ))}

                <div className="dm__bar">
                    <button
                        type="button"
                        className={`dm__transport${running ? ' is-running' : ''}`}
                        aria-pressed={running}
                        onClick={() => setRunning(value => !value)}
                    >
                        {running ? t.drums.stop : t.drums.play}
                    </button>
                    <button
                        type="button"
                        className="dm__clear"
                        onClick={() => setPattern(VOICES.map(() => Array<boolean>(STEPS).fill(false)))}
                    >
                        {t.drums.clear}
                    </button>
                    <span className="dm__count num">
                        {bar}.{beat}
                    </span>
                </div>
            </div>
        </Block>
    );
}
