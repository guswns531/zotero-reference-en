# Architecture

This addon is organized by runtime layer rather than by file type.

## Entry Flow

1. `addon/bootstrap.js`
2. `src/index.ts`
3. `src/hooks.ts`
4. `src/lifecycle/*`
5. `src/app/runtime.ts`

The bootstrap script loads the bundled addon script. The runtime then dispatches into lifecycle handlers, which initialize UI and feature services.

## Layers

### `src/lifecycle`

Startup and teardown orchestration:

- `startup.ts`
- `mainWindow.ts`
- `shutdown.ts`
- `prefs.ts`

These files should stay thin. They should coordinate startup and window events, not implement feature logic.

### `src/app`

Application-level runtime composition:

- `runtime.ts`

This layer wires together top-level features such as the reader UI and graph integrations.

### `src/ui`

UI construction and interaction containers:

- `views.ts`
- `readerPanel.ts`
- `referenceRow.ts`
- `referenceSearch.ts`
- `tip.ts`
- `preferencesPane.ts`

These files are responsible for rendering and local UI behavior. They may call feature services, but should avoid owning data-fetching policies.

### `src/features/references`

Reference parsing, matching, loading, and API integration:

- `api.ts`
- `utils.ts`
- `pdfParser.ts`
- `referenceLoader.ts`
- `referenceActions.ts`
- `tipInfo.ts`
- `identifiers.ts`
- `referenceParser.ts`
- `libraryMatch.ts`
- `sources/mappers.ts`

This is the main domain layer for references. New reference-related behavior should usually start here.

### `src/features/graph`

Connected Papers graph behavior:

- `connectedpapers.ts`
- `GraphData.ts`

Graph-specific code should stay isolated from the references feature unless there is a clear shared abstraction.

### `src/platform`

Low-level integration helpers:

- `requests.ts`
- `localStorage.ts`

This layer wraps environment-specific behavior such as cached HTTP requests and persistence.

### `src/utils`

Cross-cutting compatibility and environment helpers:

- `locale.ts`
- `window.ts`
- `wait.ts`
- `zoteroCompat.ts`
- `ztoolkit.ts`

These files should remain generic and reusable across features.

## Remaining Legacy Area

`src/modules` is now mostly legacy. New code should not be added there unless a file has not yet been migrated.

Current leftovers:

- `locale.ts`
- `d3.js`

## Practical Rules

- Put rendering code in `src/ui`.
- Put data parsing and domain logic in `src/features`.
- Put startup wiring in `src/lifecycle`.
- Put Zotero/platform wrappers in `src/platform` or `src/utils`.
- Avoid re-introducing large all-purpose files like the old `views.ts` or `utils.ts`.
