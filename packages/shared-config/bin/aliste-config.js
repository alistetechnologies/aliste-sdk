#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { eslintConfig, prettierConfig, lintStagedConfig, PKG_ROOT } = require('../lib/paths');

const [, , command, ...args] = process.argv;

function resolvePackageBin(packageName) {
    const pkgJsonPath = require.resolve(`${packageName}/package.json`, {
        paths: [process.cwd(), PKG_ROOT],
    });
    const pkgDir = path.dirname(pkgJsonPath);
    const pkg = require(pkgJsonPath);
    const binEntry =
        typeof pkg.bin === 'string'
            ? pkg.bin
            : pkg.bin[packageName] || pkg.bin[Object.keys(pkg.bin)[0]];
    return path.join(pkgDir, binEntry);
}

function runNode(binPath, binArgs, options = {}) {
    const { exitOnComplete = true } = options;
    const result = spawnSync(process.execPath, [binPath, ...binArgs], {
        stdio: 'inherit',
        cwd: process.cwd(),
    });
    const status = result.status === null ? 1 : result.status;
    if (exitOnComplete) {
        process.exit(status);
    }
    return status;
}

function runEslint() {
    runNode(resolvePackageBin('eslint'), ['--config', eslintConfig, ...args]);
}

function runPrettier() {
    runNode(resolvePackageBin('prettier'), ['--config', prettierConfig, ...args]);
}

function runLintStaged() {
    runNode(resolvePackageBin('lint-staged'), ['--config', lintStagedConfig, ...args]);
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function writeFileIfMissing(filePath, content, force) {
    if (!force && fs.existsSync(filePath)) {
        console.log(`skip ${path.relative(process.cwd(), filePath)} (already exists)`);
        return false;
    }
    fs.writeFileSync(filePath, content);
    console.log(`wrote ${path.relative(process.cwd(), filePath)}`);
    return true;
}

const STUB_FILES = {
    'eslint.config.js': "module.exports = require('@aliste-sdk/shared-config/eslint');\n",
    'prettier.config.js': "module.exports = require('@aliste-sdk/shared-config/prettier');\n",
    'lint-staged.config.js': "module.exports = require('@aliste-sdk/shared-config/lint-staged');\n",
};

const DEFAULT_SCRIPTS = {
    lint: 'aliste-config eslint .',
    'lint:fix': 'aliste-config eslint . --fix',
    format: 'aliste-config prettier --write .',
    'format:check': 'aliste-config prettier --check .',
    prepare: 'husky',
};

function runInit() {
    const force = args.includes('--force');
    const skipHusky = args.includes('--skip-husky');
    const cwd = process.cwd();
    const pkgPath = path.join(cwd, 'package.json');

    if (!fs.existsSync(pkgPath)) {
        console.error('init: no package.json found in the current directory');
        process.exit(1);
    }

    const pkg = readJson(pkgPath);
    pkg.scripts = pkg.scripts || {};

    for (const [name, script] of Object.entries(DEFAULT_SCRIPTS)) {
        if (force || !pkg.scripts[name]) {
            pkg.scripts[name] = script;
        }
    }

    writeJson(pkgPath, pkg);

    for (const [fileName, content] of Object.entries(STUB_FILES)) {
        writeFileIfMissing(path.join(cwd, fileName), content, force);
    }

    if (!skipHusky) {
        const huskyDir = path.join(cwd, '.husky');
        ensureDir(huskyDir);

        const huskyStatus = runNode(resolvePackageBin('husky'), ['init'], {
            exitOnComplete: false,
        });
        if (huskyStatus !== 0) {
            console.warn('warn: husky init failed — run `npx husky init` manually');
        }

        const preCommitPath = path.join(huskyDir, 'pre-commit');
        const preCommit = '#!/bin/sh\naliste-config lint-staged\n';
        fs.writeFileSync(preCommitPath, preCommit, { mode: 0o755 });
        console.log('wrote .husky/pre-commit');
    }

    console.log('\nDone. Next steps:');
    console.log('  npm install');
    console.log('  npm run lint');
    if (skipHusky) {
        console.log(
            '\nHusky was skipped. Add a pre-commit hook that runs: aliste-config lint-staged'
        );
    }
}

function printHelp() {
    console.log(`@aliste-sdk/shared-config

Usage:
  aliste-config eslint [eslint options...]   Lint with the shared ESLint config
  aliste-config prettier [options...]        Format with the shared Prettier config
  aliste-config lint-staged [options...]     Run lint-staged with the shared config
  aliste-config init [--force] [--skip-husky]  Add scripts, stub configs, and Husky hook

Minimal consumer setup (no init):
  npm install -D @aliste-sdk/shared-config
  package.json scripts:
    "lint": "aliste-config eslint ."
    "format": "aliste-config prettier --write ."
    "prepare": "husky"
  .husky/pre-commit:
    aliste-config lint-staged

Or run once:
  npx aliste-config init
`);
}

switch (command) {
    case 'eslint':
        runEslint();
        break;
    case 'prettier':
        runPrettier();
        break;
    case 'lint-staged':
        runLintStaged();
        break;
    case 'init':
        runInit();
        break;
    case undefined:
    case 'help':
    case '--help':
    case '-h':
        printHelp();
        break;
    default:
        console.error(`Unknown command: ${command}\n`);
        printHelp();
        process.exit(1);
}
