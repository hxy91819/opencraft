# OpenCraft product identity

OpenCraft is the product name for the Web, Electron, and Expo hosts. Source
packages use `@opencraft/*`; build environment variables use `OPENCRAFT_*`
and `VITE_OPENCRAFT_*`. There are no old package aliases or dual environment
variable readers. Electron remains pinned to 44.1.0.

## Directory identity charter

Brand, installation identity, product data, runtime state and task workspace are
separate identities. No layer may derive one from another implicitly.

Product state roots are stable authorities; a Thread carries its explicit workspace cwd.
The launch directory is not the product data root.

### Canonical roots

| Role | macOS canonical path | Owner | Persistence |
|---|---|---|---|
| Installed application | `/Applications/OpenCraft.app` when installed | Installer / user | Replaceable binary; read-only at runtime |
| Packaged resources | `OpenCraft.app/Contents/Resources` | Build artifact | Versioned with the application; never written |
| Desktop application state | `~/Library/Application Support/OpenCraft` | Electron Main | Durable platform state |
| Preview application state | `~/Library/Application Support/OpenCraft Preview` | Electron Preview Main | Durable but isolated from production |
| Managed runtime root | `<desktop-state>/runtime` | Electron Main | Stable cwd and runtime-owned files |
| DSH state | `<desktop-state>/dsh` | Local Agent Host / DSH | Durable engine state |
| Codex state | `<desktop-state>/codex` | OpenCraft Daemon / Codex Engine Adapter | Account Pool metadata, private credentials and isolated native runtime state |
| Daemon endpoint and token | `<desktop-state>/opencraft-daemon.sock` and `opencraft-daemon.token` | Electron Main / Daemon | Runtime coordination; never shared with Preview |
| Product home | `OPENCRAFT_HOME`, otherwise `~/.opencraft` | OpenCraft product services | Portable product configuration, Projects, Skills and model definitions |
| Project workspace | Explicit Project/Thread cwd | Project catalog / Thread | User-owned files |
| Projectless workspace | `<product-home>/workspaces/<stable-id>` | Conversation creation transaction | Durable until explicitly removed |

Installation IDs are owned by each build configuration:

| Host/profile | Identifier | Authority |
|---|---|---|
| Desktop installed app | `dev.opencraft.workbench` | `apps/workbench-electron/package.json` |
| macOS local Preview | `dev.opencraft.workbench.preview` | `scripts/package-macos-preview.mjs` |
| Standalone Expo Android and iOS | `dev.opencraft.workbench` | `apps/workbench-expo/app.json` |
| Explicit downstream Expo product | Defined by the selected product | Local config selected by `OPENCRAFT_EXPO_PRODUCT_CONFIG` |

`apps/workbench-expo/app.config.js` delegates product configuration through
`product-entry.cjs` and preserves the public open-source notices in the final
manifest. The standalone core does not select a product from
`OPENCRAFT_ANDROID_RELEASE` or `OPENCRAFT_IOS_RELEASE`; a selected downstream
configuration owns any release flags, edition, package ID and signing profile.
The downstream runner selects that configuration before invoking Expo.

Desktop installers and Preview bundles must match their compiled host identity.
An old installation identifier in a migration or mismatch fixture is historical
input, not the current package identity. Changing an identifier creates a separate
installation; it does not update the old package or rename its data root.
Downstream branding never authorizes a different core data root.

### Authority rules

1. One platform path resolver computes every canonical root before instance
   locking, Chromium session creation, database opening or daemon startup.
   Feature code consumes resolved paths; it does not call `homedir()`,
   `app.getPath("appData")` or `process.cwd()` to invent storage.
2. `process.resourcesPath` is the only packaged-resource authority. Runtime
   code never writes into the app bundle and does not depend on where the bundle
   was mounted, downloaded or launched.
3. Every managed Main, Daemon and DSH process has an explicit cwd equal to the
   managed runtime root. The cwd is operational context only, never a data or
   workspace lookup fallback.
4. Every Agent execution receives an explicit Project/Thread cwd. Missing cwd
   is rejected or resolved through the projectless-workspace transaction; it
   never falls back to `/`, the checkout, the app bundle or `process.cwd()`.
5. Product home and desktop application state are different roots. Product
   configuration can move between clients; Chromium state, sockets and local
   databases remain platform-private.
6. Preview and production never share application state, sockets, databases,
   credentials or runtime cwd. Explicit test overrides remain authoritative and
   never trigger production-profile migration.

### Legacy migration

`~/Library/Application Support/@vela/workbench-electron` and
`@vela/workbench-electron-preview` are legacy inputs, not canonical destinations.
The production migration must run before `app.setPath("userData")` and before
single-instance/daemon ownership is acquired:

1. An explicit `--user-data-dir` wins and disables automatic migration.
2. If the OpenCraft root exists, use it and do not merge a legacy tree into it.
3. If only the legacy production root exists, atomically rename it to the
   OpenCraft root on the same volume, then create a compatibility link from the
   legacy path to the canonical root for the supported rollback window.
4. After the durable tree moves, rename the legacy daemon token to its OpenCraft
   filename and discard stale socket files; sockets are process artifacts, not
   migratable data. Migration proceeds only after proving no legacy daemon owns
   the profile.
5. If migration cannot complete, continue on the intact legacy root and report
   a bounded diagnostic; never start with an empty new profile or partially copy
   databases.
6. Preview state is migrated only by the Preview product and never from or into
   the production profile.
7. Migration is idempotent, lock-aware and covered for success, existing-new,
   explicit override, rollback and concurrent-old-version cases. Removing the
   compatibility link is a later explicit migration, not cleanup during startup.

### Implementation state

Current source resolves and prepares the complete directory plan before
single-instance ownership, appends the same `--user-data-dir` for Chromium
helpers, sets Electron userData, and switches Main to the managed runtime cwd.
Daemon and DSH receive that runtime directory explicitly. New native Threads
reject a missing workspace cwd instead of inheriting process cwd.

The migration moves an inactive legacy profile atomically, renames the daemon
token, discards stale sockets and creates the rollback compatibility link. An
active legacy runtime defers migration and a post-rename failure rolls back to
the intact legacy profile. Explicit `--user-data-dir` profiles skip migration.

Migration occurs only when a rebuilt application is installed and launched;
building source alone never moves a machine's profile.

Current first-party plugin, provider and View registrations use `opencraft.*`.
The Web composition migrates exact former built-in provider IDs only when their
current provider is registered, preserving Host IDs, recipes and observations.
Exact former first-party Settings/View bookmarks resolve through Router REPLACE.
Third-party identities remain opaque. The optional first-party Paper palette
also normalizes its exact former ID before preferences copy forward.
`opencraft-bot:` resource URIs are produced by the Bot owner; exact former
resource schemes remain readable for saved Views. Database identities and product
storage partitions remain with their storage owners; these registration changes do not implicitly
migrate or clear those separate contracts.

Appearance preferences write the current `opencraft.appearance-theme` and
`opencraft.appearance-theme-id` keys. The six built-in theme IDs use
`opencraft.core.*`; their exact old IDs and preference keys are read only for
compatibility, with current values taking precedence. Extension-owned theme
identities remain opaque. Client projection metadata writes `__opencraft*`
fields; exact old `__vela*` fields are compatibility reads, not the current
write format. Unknown metadata remains intact.

These compatibility identities do not authorize new downstream product-named
filesystem paths, directories, sockets, tokens, databases or logs. Published
`ioa_*` table identities remain storage contracts and are not renamed by source
cleanup. There is one schema and one reader rather than a compatibility fork.

Bot capability declarations use `opencraft/bot-conversations`; clients read the
exact former identifier only when the current declaration is absent. Other
AppServer capability strings and published browser tool names still require
their own owner migration. These identity changes keep the Bot payload version
and domain schema unchanged. Generic `thread/*`, `turn/*`, and `bot/*` methods are
unchanged. Native deep links now use `opencraft:`.

## Service-provider ownership

the downstream product remains a service-provider plugin. Its domains, OAuth callbacks,
account identifiers, backend names and configuration do not become OpenCraft.
Third-party DSH, Hermes and Codex integrations retain their protocol identities.

## Checkout and release

The product does not depend on the physical checkout path or its basename.
Deployment directories and running installations are not moved by
source rebranding. Mac builds now produce `OpenCraft.app`, and scripts use
explicit `OPENCRAFT_MAC_*` settings. Builds must be deployed separately; source renaming
does not replace the running production website or Mac application.
