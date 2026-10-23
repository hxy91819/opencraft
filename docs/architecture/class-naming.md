# Class names and engine ownership

OpenCraft-owned Host policy, metadata and storage use `OpenCraft` class names.
Classes that implement a specific execution engine retain its name. A source
rename does not introduce support for another engine or migrate stored data.

## OpenCraft-owned classes

| Class | Responsibility |
| --- | --- |
| [OpenCraftHostQueue](../../apps/opencraft-daemon/src/opencraft-host-queue.ts) | OpenCraft owns durable input admission, ordering, delivery state and recovery. Its explicit native-queue importer still reads the legacy Codex format. |
| [OpenCraftHostStateDatabase](../../apps/opencraft-daemon/src/opencraft-host-state-database.ts) | OpenCraft owns migration and transactions for queue, sender provenance, Bot metadata and the durable catalog. |
| [OpenCraftMessageAttachments](../../apps/opencraft-daemon/src/opencraft-message-attachments.ts) | OpenCraft stores display references separately from native engine input. |
| [OpenCraftTokenUsageLedger](../../apps/opencraft-daemon/src/token-usage-ledger.ts) | OpenCraft owns metering facts, allocation, recovery checkpoints and query authority; engine collectors supply verified source facts. Native-counter and rollout state remain explicit source records. |
| [OpenCraftQueueRpcError](../../apps/opencraft-daemon/src/codex-engine-adapter.ts) | This local error carries OpenCraft queue admission and dispatch failures. |
| [OpenCraftMessageSenders](../../apps/opencraft-daemon/src/opencraft-message-senders.ts) | OpenCraft owns sender provenance; all internal consumers use this shared implementation directly. |

The daemon workspace is private. These source files are internal implementation
entries, not Extension API V1. All in-repository imports, scripts and tests move
with their classes; no second implementation or old class-name alias remains.
Message metadata consumers import the canonical thread projection helpers
described in the [internal naming contract](internal-naming.md).

## Engine-specific classes retained

| Class | Engine-specific responsibility |
| --- | --- |
| `CodexEngineAdapter` | Adapts native Codex execution and account methods to OpenCraft Host capabilities. |
| `CodexThreadTitles` | Uses Codex ephemeral Threads, native configuration, sandbox policy and Turn notifications for title inference. |
| `CodexThreadPins` | Adapts the native reserved section ID and thread-section methods. |
| `CodexNativeCoreTransport` | Opens native Codex connections through the independent core. |
| `CodexCoreSocket` | Connects to the Codex core socket and its connection protocol. |
| `CodexCoreBridge` | Bridges logical clients to the Codex core service. |
| `CodexTokenUsageRuntime` | Collects Codex native events, UUIDv7 Turn identity and rollout files from codexHome. |
| `SshCodexConnectionError` | Classifies failures of the Codex-over-SSH transport. |
| `SshCodexTransport` | Runs the actual Codex app-server proxy and tunnels its protocol. |
| `CodexAccountsService` | Client service for Codex account and device-login RPCs. |
| `CodexDeviceLoginService` | Implements native Codex/ChatGPT device authorization and credential import. |
| `CodexSubscriptionService` | Reads Codex subscription and rate-limit provider responses. |
| `CodexAccountService` | Owns Codex-specific account operations and credentials. |
| `CodexCoreControlClient` | Sends control requests to the independent Codex core. |
| `CodexCredentialRefreshManager` | Refreshes Codex OAuth credentials. |
| `CodexAccountPoolProxy` | Proxies Codex provider requests and account quota/affinity policy. |

## Stable external and persisted identities

The rename changes TypeScript symbols and internal module paths. It preserves:

- Existing `codex-host-queue.sqlite` and `codex-message-attachments.sqlite` paths,
  tables, indices, migration names, versions and SQL checksums.
- Native Codex queue import format, delivery reconciliation and source records.
- Host IDs, environment variables, capability/RPC identifiers and generated
  Codex protocol types.
- Account credentials, installation state and conversation identities.

The remaining engine-specific names describe actual integrations. Future generic
implementations should obtain their own owner and verified capability contract;
renaming a native adapter alone cannot establish engine independence.

Owned CSS, model discriminators, projection helpers and compatibility inputs
follow the [internal naming contract](internal-naming.md).
