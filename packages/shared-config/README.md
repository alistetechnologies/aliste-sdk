# @aliste-sdk/shared-config

Shared ESLint, Prettier, and lint-staged configuration for Aliste Node.js services, plus an **`aliste-config` CLI** so consuming repos do not need to duplicate tooling setup.

---

## What you get

| Piece | Description |
| ----- | ----------- |
| ESLint flat config | Node.js rules for `**/*.{js,mjs,cjs}` (recommended + `eslint-plugin-n` + Prettier integration) |
| Prettier config | Semi, single quotes, 100 print width, 4-space tabs |
| lint-staged map | Format and lint staged JS files on commit |
| `aliste-config` CLI | Runs each tool with bundled config paths — no root config files required for CI/scripts |
| `aliste-config init` | Scaffolds scripts, optional stub configs, and a Husky pre-commit hook |

Bundled dependencies: `eslint`, `prettier`, `lint-staged`, and `husky`. Consumers install **one** dev dependency.

---

## Quick start

```bash
npm install -D @aliste-sdk/shared-config
npx aliste-config init
npm install
npm run lint
```

`init` updates `package.json` scripts, writes one-line stub configs (for editor/IDE support), runs `husky init`, and sets `.husky/pre-commit` to `aliste-config lint-staged`.

### Scripts added by `init`

| Script | Command |
| ------ | ------- |
| `lint` | `aliste-config eslint .` |
| `lint:fix` | `aliste-config eslint . --fix` |
| `format` | `aliste-config prettier --write .` |
| `format:check` | `aliste-config prettier --check .` |
| `prepare` | `husky` |

---

## Zero-config setup (no stub files)

If you prefer not to add `eslint.config.js` / `prettier.config.js` at the repo root, add scripts and Husky manually:

```json
{
    "scripts": {
        "lint": "aliste-config eslint .",
        "lint:fix": "aliste-config eslint . --fix",
        "format": "aliste-config prettier --write .",
        "format:check": "aliste-config prettier --check .",
        "prepare": "husky"
    }
}
```

`.husky/pre-commit`:

```sh
#!/bin/sh
aliste-config lint-staged
```

The CLI injects `--config` pointing at this package’s configs, so `npm run lint` works without local ESLint/Prettier config files.

---

## CLI reference

```bash
aliste-config eslint [options...]       # ESLint with shared flat config
aliste-config prettier [options...]     # Prettier with shared options
aliste-config lint-staged [options...]  # lint-staged with shared task map
aliste-config init [--force] [--skip-husky]
aliste-config help
```

| Flag | Effect |
| ---- | ------ |
| `--force` | Overwrite generated stub configs and pre-commit hook |
| `--skip-husky` | Only add scripts and stub configs; no Git hook |

---

## Programmatic use

Re-export shared configs from your repo (optional, mainly for IDE integration):

```js
// eslint.config.js
module.exports = require('@aliste-sdk/shared-config/eslint');

// prettier.config.js
module.exports = require('@aliste-sdk/shared-config/prettier');

// lint-staged.config.js
module.exports = require('@aliste-sdk/shared-config/lint-staged');
```

Or require the bundle:

```js
const { eslint, prettier, lintStaged } = require('@aliste-sdk/shared-config');
```

Subpath exports: `@aliste-sdk/shared-config/eslint`, `/prettier`, `/lint-staged`.

---

## TypeScript repos

The shared ESLint config only lints `**/*.{js,mjs,cjs}`. TypeScript services need a local `eslint.config.js` that extends or replaces these rules until TypeScript support is added to this package.

---

## Migrating from 1.0.0

1. Upgrade: `npm install -D @aliste-sdk/shared-config@^1.1.0`
2. Remove separate installs of `eslint`, `prettier`, `lint-staged`, and `husky` if they were only used for this config (they are now bundled).
3. Replace manual config wiring with `npx aliste-config init` or point scripts at `aliste-config` (see above).
4. Update `.husky/pre-commit` to run `aliste-config lint-staged` instead of raw `npx lint-staged`.

---

## Development (this monorepo)

```bash
cd packages/shared-config
npm run lint
```

---

## License

MIT — see [Aliste SDK](https://github.com/alistetechnologies/aliste-sdk).
