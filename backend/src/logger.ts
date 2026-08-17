/**
 * Minimal levelled logger. No dependency, no ceremony — but unlike v1's bare
 * `console.log` it can be quietened in production and never prints payloads
 * that might contain a session token.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };

function configuredLevel(): LogLevel {
    const fromEnv = process.env.LOG_LEVEL as LogLevel | undefined;
    if (fromEnv && fromEnv in ORDER) return fromEnv;
    return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

const threshold = ORDER[configuredLevel()];

export function logger(scope: string) {
    const emit =
        (level: Exclude<LogLevel, 'silent'>, sink: (...args: unknown[]) => void) =>
        (message: string, ...rest: unknown[]) => {
            if (ORDER[level] < threshold) return;
            sink(`${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} [${scope}] ${message}`, ...rest);
        };

    return {
        debug: emit('debug', console.debug),
        info: emit('info', console.info),
        warn: emit('warn', console.warn),
        error: emit('error', console.error),
    };
}
