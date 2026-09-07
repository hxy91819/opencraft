# OpenCraft

OpenCraft is a clean-room, maintainable TypeScript workbench built from the latest
recovered Codex renderer semantics. It has two real renderer hosts over one
semantic application model and an explicit supervisor for lifecycle-scoped
runtimes: Vite/React DOM for desktop Web and Electron, and Expo Router for iOS,
Android, and Expo Web.

Branding, installed application identity, storage, and protocol namespaces are
separate concerns. See [product identity](docs/architecture/product-identity.md)
for the OpenCraft naming policy and the identifiers intentionally kept stable.

## Run

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 10000
npm run dev:expo:web
# macOS with Xcode and CocoaPods:
npm run dev:expo:ios
```

The Web workbench treats every execution node as a complete Host runtime. A
single same-origin AppServer is discovered automatically. Multiple nodes can be
declared without changing renderer code:

```bash
VITE_APPSERVER_HOSTS_JSON='[
  {"hostId":"dev","label":"Development","kind":"remote-ssh","url":"wss://dev.example/rpc"},
  {"hostId":"durable","label":"Durable","kind":"durable","url":"wss://durable.example/rpc"}
]' npm run dev:web
```

Host selection precedes project/folder selection. Threads, Draft workspace,
Replica state, query keys, panels, and persisted selection are all scoped by
`hostId`. Host URLs containing credentials are rejected; authentication belongs
to the Web/Electron transport gateway.

The renderer is semantic React/TypeScript and SCSS. It does not execute the
generated recovery runtime. Provenance is pinned in
`vendor/codex/IMPORT_MAP.json` to the r822 semantic source tree and the r823 to
r826 audit, build, browser-differential, and hydration gates.

## Workspace

- `apps/workbench-web`: React DOM + Vite renderer for browser and Electron.
- `apps/workbench-desktop`: Electron main/preload host without a second UI.
- `apps/workbench-expo`: Expo Router host for native and Expo Web.
- `packages/appserver-protocol`: host-aware Codex app-server transport types.
- `packages/chat-core`: typed `Turn -> DisplayItem` projection.
- `packages/composer-core`: serializable cross-platform composer blocks.
- `packages/codex-composer`: ProseMirror composer with IME-safe input,
  attachments, mentions, skills, commands, history, and send/stop semantics.
- `packages/design-system`: typed Codex theme compiler plus Web and Native tokens.
- `packages/workbench-runtime`: renderer-free session store, commands and
  streaming lifecycle consumed by both renderer hosts.

The Expo host uses Unistyles 3 over one canonical React 19 instance. It is a
custom native development build, not an Expo Go target. `npm run
build:expo:ios` runs the Linux-compatible Metro iOS bundle gate; launching an
Apple Simulator and compiling the native pods still require macOS and Xcode.

The frame contract and exact recovery evidence are documented in
`docs/codex-frame-spec.md`. Platform boundaries and reuse rules are documented
in `docs/platform-architecture.md`. The Cordis-backed extension kernel,
capability boundary and future marketplace model are documented in
`docs/plugin-architecture.md`; the AI-native discovery, task lease, execution
journal and generated-capability model are documented in
`docs/agent-capability-fabric.md`. The package ownership and proof ladder for
automated changes are documented in `docs/agent-iteration-guide.md`.
