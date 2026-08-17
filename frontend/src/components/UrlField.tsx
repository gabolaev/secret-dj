import { useEffect, useId, useRef, useState } from 'react';
import { detectService, parseUrl } from '@secret-dj/common';
import { fetchTrackMetadata } from '../lib/api';
import { serviceBadge } from '../lib/serviceLogos';
import type { TrackMetadataResponse } from '../lib/types';
import { Spinner } from './Spinner';
import { useT } from '../i18n';

interface UrlFieldProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    disabled?: boolean;
    busy?: boolean;
}

const DEBOUNCE_MS = 400;

/**
 * Paste-a-link field with a preview.
 *
 * The lookup is debounced and aborted, and the response is only applied if it
 * still matches the current input — v1 fired a request per keystroke with no
 * cancellation, so a slow early reply could overwrite a later one.
 */
export function UrlField({ value, onChange, onSubmit, disabled, busy }: UrlFieldProps) {
    const t = useT();
    const inputId = useId();
    const [preview, setPreview] = useState<TrackMetadataResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const latest = useRef(value);
    latest.current = value;

    const trimmed = value.trim();
    const parsed = parseUrl(trimmed);
    const service = detectService(trimmed);
    const badge = service ? serviceBadge(trimmed) : null;

    useEffect(() => {
        setPreview(null);
        if (!service) {
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            setLoading(true);
            fetchTrackMetadata(trimmed, controller.signal)
                .then(metadata => {
                    if (latest.current.trim() === trimmed) setPreview(metadata);
                })
                .catch(() => undefined)
                .finally(() => {
                    if (latest.current.trim() === trimmed) setLoading(false);
                });
        }, DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [service, trimmed]);

    const state = !trimmed ? 'empty' : service ? 'known' : parsed ? 'unsupported' : 'invalid';
    const bad = state === 'invalid' || state === 'unsupported';

    return (
        <div className="url">
            <div className="url__row">
                <input
                    id={inputId}
                    className="input"
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    value={value}
                    disabled={disabled}
                    placeholder={t.url.placeholder}
                    onChange={event => onChange(event.target.value)}
                    onKeyDown={event => {
                        // Enter only submits something that could actually work.
                        if (event.key === 'Enter' && service && !disabled && !busy) {
                            event.preventDefault();
                            onSubmit();
                        }
                    }}
                    aria-invalid={bad}
                    aria-describedby={`${inputId}-hint`}
                />
                <button
                    type="button"
                    className="button button--primary"
                    onClick={onSubmit}
                    disabled={disabled || busy || !service}
                >
                    {busy ? <Spinner /> : t.url.submit}
                </button>
            </div>

            <p id={`${inputId}-hint`} className={`url__hint${bad ? ' url__hint--bad' : ''}`}>
                {state === 'invalid' && t.url.hintInvalid}
                {state === 'unsupported' && t.url.hintUnsupported}
                {state === 'empty' && t.url.hintEmpty}
                {state === 'known' && (loading ? t.url.hintLooking : preview ? t.url.hintGood : t.url.hintReady)}
            </p>

            {state === 'known' && (preview || loading) && (
                <div className="url__preview">
                    <img className="url__art" src={preview?.artwork} alt="" aria-hidden="true" />
                    <div className="url__meta">
                        <span className={`url__title${loading && !preview ? ' shimmer' : ''}`}>
                            {loading && !preview ? t.url.loading : preview?.title}
                        </span>
                        {preview?.artist && <span className="url__artist">{preview.artist}</span>}
                    </div>
                    {badge && (
                        <span className="url__badge">
                            {badge.logo && <img src={badge.logo} alt="" aria-hidden="true" />}
                            {badge.name}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
