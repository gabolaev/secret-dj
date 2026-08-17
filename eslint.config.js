import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
    { ignores: ['**/dist/**', '**/node_modules/**', '**/*.tsbuildinfo'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2023,
            globals: { ...globals.browser, ...globals.node },
        },
        rules: {
            // Unused args are often part of a signature we must keep; requiring an
            // underscore prefix documents the intent instead of deleting it.
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
            'no-console': ['warn', { allow: ['debug', 'info', 'warn', 'error'] }],
            eqeqeq: ['error', 'smart'],
        },
    },
    {
        // Stale-closure bugs in hooks are exactly what broke v1's socket handling,
        // so exhaustive-deps is an error here, not a warning.
        files: ['frontend/src/**/*.{ts,tsx}'],
        plugins: { 'react-hooks': reactHooks },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-hooks/exhaustive-deps': 'error',
        },
    },
    {
        // Tests reach into internals on purpose.
        files: ['**/test/**/*.ts'],
        rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
    },
);
