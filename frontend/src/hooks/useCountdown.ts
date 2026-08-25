import { useEffect, useState } from 'react';

/**
 * Seconds until a server instant, ticking locally and allowed to go negative.
 *
 * The server sends an absolute deadline and the clock it was stamped against,
 * so the difference between the two corrects for a clock that is minutes out
 * without needing them to agree on the time of day. Recomputed on every state
 * push, which also stops the display drifting over a long night.
 *
 * Negative is a real answer: the round does not end at zero, it just starts
 * counting the other way where everyone can see it.
 */
export function useCountdown(endsAt: number, serverNow: number): number {
    const offset = serverNow - Date.now();
    const remaining = () => Math.round((endsAt - (Date.now() + offset)) / 1000);
    const [seconds, setSeconds] = useState(remaining);

    useEffect(() => {
        setSeconds(remaining());
        if (!endsAt) return;
        const timer = window.setInterval(() => setSeconds(remaining()), 1000);
        return () => window.clearInterval(timer);
        // `remaining` closes over the current offset, which is what the deps are.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endsAt, serverNow]);

    return seconds;
}

/** `1:04`, or `-0:07` once the round has run over. */
export function formatCountdown(seconds: number): string {
    const sign = seconds < 0 ? '−' : '';
    const total = Math.abs(seconds);
    return `${sign}${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
