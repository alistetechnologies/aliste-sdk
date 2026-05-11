const js = require('@eslint/js');
const globals = require('globals');
const pluginN = require('eslint-plugin-n').default;
const prettier = require('eslint-config-prettier');
const pluginPrettier = require('eslint-plugin-prettier');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
    {
        files: ['**/*.{js,mjs,cjs}'],
        plugins: { js, n: pluginN, prettier: pluginPrettier },
        extends: ['js/recommended'],
        languageOptions: { globals: globals.node },
    },
    {
        files: ['**/*.js'],
        languageOptions: { sourceType: 'commonjs' },
        rules: {
            'no-undef': 'error',
            'n/no-missing-require': 'error',
            'n/no-missing-import': 'error',
            'no-unused-vars': ['warn', { vars: 'all', args: 'after-used' }],
            'no-use-before-define': ['error', { functions: false, classes: true }],
            'prettier/prettier': 'error',
        },
    },
    // Must be last — disables ESLint rules that conflict with Prettier
    prettier,
]);
