import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';

const VOICES = ['KICK', 'SNARE', 'HAT', 'PERC'] as const;
const STEPS = 8;

/** Something already playing when you open it: an empty grid is not a toy. */
const SEED: readonly (readonly boolean[])[] = [
    [true, false, false, false, true, false, false, false],
    [false, false, true, false, false, false, true, false],
    [true, false, true, true, true, false, true, false],
    [false, false, false, false, false, true, false, false],
];

const TEMPO_MIN = 70;
const TEMPO_MAX = 160;
const TEMPO_STEP = 10;

/**
 * A drum machine that makes no sound.
 *
 * It exists because a listening party has three minutes of nothing to do with
 * your hands, and a grid of lights running in time is the most satisfying
 * nothing there is. Deliberately silent: a room of people are listening to
 * somebody's track, and a toy that could talk over it would be a bad toy.
 *
 * Entirely local — no socket, no server, nobody else sees your pattern. It is a
 * fidget, not a feature of the game.
 */
export function DrumMachine() {
    const t = useT();
    const [pattern, setPattern] = useState<boolean[][]>(() => SEED.map(row => [...row]));
    const [tempo, setTempo] = useState<number>(120);
    const [running, setRunning] = useState(true);
    const [step, setStep] = useState(0);
    /**
     * Pads struck in the last moment, so a click reads as an *event* and not
     * only as a change of state. Without this, hitting a pad on a stopped
     * machine produced no feedback at all beyond the cap changing colour.
     */
    const [hits, setHits] = useState<ReadonlySet<string>>(new Set());
    const timers = useRef(new Set<number>());

    useEffect(() => {
        const pending = timers.current;
        return () => {
            for (const timer of pending) window.clearTimeout(timer);
            pending.clear();
        };
    }, []);

    useEffect(() => {
        if (!running) return;
        // Eighth notes: fast enough to feel like a machine, slow enough to read.
        // Keyed on tempo alone, so changing it does not reset the bar.
        const interval = window.setInterval(() => setStep(current => (current + 1) % STEPS), 30_000 / tempo);
        return () => window.clearInterval(interval);
    }, [running, tempo]);

    const strike = (voice: number, index: number) => {
        const key = `${voice}:${index}`;
        setHits(current => new Set(current).add(key));
        // A tick you can feel, where the hardware would have given you one.
        // Silent, brief, and absent on anything that cannot vibrate.
        navigator.vibrate?.(8);

        const timer = window.setTimeout(() => {
            timers.current.delete(timer);
            setHits(current => {
                const next = new Set(current);
                next.delete(key);
                return next;
            });
        }, 220);
        timers.current.add(timer);

        setPattern(current =>
            current.map((row, r) => (r === voice ? row.map((on, i) => (i === index ? !on : on)) : row)),
        );
    };

    /** Lit by the playhead, or by a pad you just hit in that column. */
    const columnLit = (index: number) =>
        (running && step === index) || [...hits].some(key => key.endsWith(`:${index}`));

    const bar = Math.floor(step / 4) + 1;
    const beat = (step % 4) + 1;

    return (
        <div className="dm">
            {/* The readout strip: the one black surface, the way the hardware
                puts its numbers behind glass rather than on the panel. */}
            <div className="dm__display">
                <span className="dm__glyph" aria-hidden="true">
                    {running ? '▶' : '■'}
                </span>
                <span className="dm__bpm-read">
                    {tempo}
                    <i>BPM</i>
                </span>
                <span className="dm__spacer" />
                <span className="dm__bpm-read dm__bpm-read--dim">
                    {bar}.{beat}
                    <i>BAR</i>
                </span>
            </div>

            {/* A row of lamps above the grid rather than lighting the pads
                themselves: on the hardware the indicators are their own parts,
                and the blink reads far better when it is not fighting a keycap. */}
            <div className="dm__lights" aria-hidden="true">
                {Array.from({ length: STEPS }, (_, index) => (
                    <span
                        key={index}
                        className={`dm__led${columnLit(index) ? ' is-lit' : ''}${index % 4 === 0 ? ' is-downbeat' : ''}`}
                    />
                ))}
            </div>

            <div className="dm__grid">
                {VOICES.map((voice, row) => (
                    <div className="dm__row" key={voice}>
                        <span className="dm__voice">{voice}</span>
                        {pattern[row].map((on, index) => (
                            <button
                                key={index}
                                type="button"
                                className={`dm__pad${on ? ' is-on' : ''}${running && step === index ? ' is-now' : ''}${hits.has(`${row}:${index}`) ? ' is-hit' : ''}`}
                                aria-pressed={on}
                                aria-label={`${voice} ${index + 1}`}
                                onClick={() => strike(row, index)}
                            />
                        ))}
                    </div>
                ))}
            </div>

            <div className="dm__bar">
                <button
                    type="button"
                    className={`dm__transport${running ? ' is-running' : ''}`}
                    aria-pressed={running}
                    onClick={() => setRunning(value => !value)}
                >
                    {running ? t.drums.stop : t.drums.play}
                </button>

                {/* Two keys, not four presets: the number they set is already
                    on the display above, and four buttons repeating it is what
                    pushed CLEAR off the end of the row. */}
                <span className="dm__tempo" role="group" aria-label={t.drums.tempo}>
                    <button
                        type="button"
                        className="dm__bpm"
                        aria-label={t.drums.slower}
                        disabled={tempo <= TEMPO_MIN}
                        onClick={() => setTempo(value => Math.max(TEMPO_MIN, value - TEMPO_STEP))}
                    >
                        −
                    </button>
                    <button
                        type="button"
                        className="dm__bpm"
                        aria-label={t.drums.faster}
                        disabled={tempo >= TEMPO_MAX}
                        onClick={() => setTempo(value => Math.min(TEMPO_MAX, value + TEMPO_STEP))}
                    >
                        +
                    </button>
                </span>

                <button
                    type="button"
                    className="dm__clear"
                    onClick={() => setPattern(VOICES.map(() => Array<boolean>(STEPS).fill(false)))}
                >
                    {t.drums.clear}
                </button>
            </div>
        </div>
    );
}
