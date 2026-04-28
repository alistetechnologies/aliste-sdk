# aliste-sdk

Open-source SDK monorepo by [Aliste Technologies](https://alistetechnologies.com). Contains reusable TypeScript packages that standardize cross-cutting concerns — observability, configuration, authentication, and more — for Node.js services.

Packages are published to the public npm registry under the `@aliste-sdk` scope.

---

## Available Packages

| Package | Version | Description |
|---|---|---|
| [`@aliste-sdk/observability`](packages/observability/) | `1.0.0` | OpenTelemetry tracing + Prometheus metrics for Express services |


---

## Monorepo Structure

```
aliste-sdk/
├── package.json              # npm workspaces root — declares packages/*
├── packages/
│   └── observability/        # @aliste-sdk/observability
│       ├── src/              # TypeScript source
│       ├── examples/         # Usage examples
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
└── README.md
```

This repository uses **npm workspaces**. The root `package.json` declares `"workspaces": ["packages/*"]`, which means:

- `npm install` at the root installs dependencies for all packages and hoists shared modules to `node_modules/` at the root.
- Cross-package references are resolved via symlinks in the root `node_modules/`.
- Each package under `packages/` is an independently publishable npm package with its own `package.json`, `tsconfig.json`, and build output.

---

## Development Workflow

### Prerequisites

- Node.js >= 18
- npm >= 9

### Install all dependencies

Run from the monorepo root. npm workspaces will install and hoist all package dependencies in one pass:

```bash
npm install
```

### Build a specific package

```bash
cd packages/observability
npm run build
```

### Build all packages from root

```bash
npm run build --workspaces
```

### Clean build outputs

```bash
npm run clean --workspaces --if-present
```

### Test locally in another project

Use `npm link` to consume a package before publishing:

```bash
# In the SDK package directory
cd packages/observability
npm link

# In the consuming project
npm link @aliste-sdk/observability
```

Or use a relative `file:` path in the consuming project's `package.json` during development:

```json
{
  "dependencies": {
    "@aliste-sdk/observability": "file:../aliste-sdk/packages/observability"
  }
}
```

---

## Coding Standards

All packages in this repository follow the same conventions:

**TypeScript everywhere.** No JavaScript source files. Strict mode enabled (`"strict": true`). Types are exported alongside implementations so consuming services get full IntelliSense.

**Modular structure.** Each package organizes source into domain-focused subdirectories (`src/tracing/`, `src/metrics/`, `src/config/`, `src/types/`, `src/utils/`). A single `src/index.ts` defines the public API surface — nothing else is exported.

**Separation of concerns.** Configuration resolution, business logic, and framework integration are kept in separate modules. This makes individual pieces testable in isolation and avoids tight coupling between, for example, the metrics registry and the Express middleware.

**No global singletons from third-party libraries.** Where a library offers both a global singleton and a custom instance (e.g. `prom-client`'s global `register`), we always use the custom instance. This prevents cross-contamination between packages and makes test isolation straightforward.

**Sensible, safe defaults.** Every configuration value has a default that is safe and useful in development. Production values are driven by environment variables. Services need zero configuration to get started and can override progressively.


---

## Versioning Strategy

All packages in this repository follow [Semantic Versioning](https://semver.org/):

- **Patch** (`1.0.x`) — bug fixes, internal refactors with no API change.
- **Minor** (`1.x.0`) — new optional configuration fields, new exported utilities, new default behaviors that do not break existing consumers.
- **Major** (`x.0.0`) — removed exports, renamed functions or config fields, changed default behaviors that would break existing consumers.

**Breaking changes require a major version bump and a migration note in the package's `CHANGELOG.md`** (to be created alongside the first breaking change).

When a package has a breaking change, other packages in this monorepo that depend on it must be updated in the same PR. We do not support consumers pinning to a broken intermediate state.

---

## Publishing Strategy

Packages are published to the **public npm registry** under the `@aliste-sdk` scope.

Each package is published independently. A change to `@aliste-sdk/observability` does not trigger republication of any other package.

To publish a package:

1. Bump the version in the package's `package.json` following the versioning strategy above.
2. Ensure `dist/` is up to date: `npm run build`.
3. Log in to npm: `npm login`.
4. Run `npm publish` from the package directory.

Each package's `publishConfig` is set to `"access": "public"` so no additional flags are needed.

---

## Contribution Guidelines

Contributions are welcome via pull request.

### Adding a new package

1. Create a new directory under `packages/` following the existing structure (`src/`, `dist/`, `examples/`, `package.json`, `tsconfig.json`, `README.md`).
2. Use `@aliste-sdk/<package-name>` as the package name.
3. Set `"license": "MIT"` and `"publishConfig": { "access": "public" }` in `package.json`.
4. Open a pull request for review before merging.

### Modifying `@aliste-sdk/observability`

- Changes to the public API surface (`src/index.ts` exports) require a version bump per the versioning strategy above.
- Changes to internal implementation (config resolution, route normalization, collectors) that do not affect the exported types or function signatures are patch-level changes.
- Any change that affects how consumers must initialize the SDK is a breaking change and requires a major version bump.

## License

[MIT](LICENSE)
