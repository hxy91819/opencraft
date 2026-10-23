# Owned presentation and model names

OpenCraft owns CSS classes, timeline block discriminators, document directives,
local projection identities and shared presentation helpers. Name these for their
domain. An engine name belongs at a real adapter or compatibility boundary.
The retained engine classes are reviewed separately in [class naming](class-naming.md).

## Owned names

| Area | Canonical names and owner |
| --- | --- |
| Thread-tool rows | `thread-tool-row` in Web; `NativeThreadToolRow`, `threadToolRow` and `threadToolTitle` in Expo. Both consume the shared tool presentation. |
| Account Settings styles | `engine-account*` and `engine-device-login*` in [engine-accounts.scss](../../apps/workbench-web/src/styles/engine-accounts.scss). The current consumer still manages actual Codex accounts. |
| Setup interactions | `setup-step` response/block and `interaction:setup-step` projection input. Web and Expo consume the same model and interaction broker. |
| File citations | `file-citation` document directive, compiled from native citation syntax and consumed by Web and Native renderers. Raw citation text is unchanged. |
| Replica compatibility identities | `appserver-thread:<hostId>:<threadId>` and `appserver-v3:<hostId>:<generation>` identify local V3 projections, including non-Codex Hosts. They are not native Thread IDs or durable V4 journal cursors. |
| User-message projection | `UserMessageSemantics`, `deriveUserMessageSemantics`, `extractLastUserRequest`, `stripGoalDirective`, `normalizeTurnUserMessages` and `userMessageCompareKey`. |
| Message metadata | `projectThreadMessageResult` / `projectThreadMessageNotification` and `projectThreadAttachmentResult` / `projectThreadAttachmentNotification`; consumers import their canonical modules directly. |
| Thread-tool presentation | `ThreadToolNavigationTarget`, `threadToolNavigationTarget` and `thread-tools.ts`; presenters use `thread-tools` / `settings-tools` names and `thread-tool:` summary keys. |
| Storage source constants | `OPENCRAFT_HOST_*` and `OPENCRAFT_MESSAGE_ATTACHMENTS_BASELINE`; SQL contents and migration identity stay at the existing database owner. |
| Inline image metadata | `inline-image-url` describes Web and Native Composer attachments carried as data URLs. The compiler selects image input from the MIME type and URI, independently of this diagnostic label. |

The typography checker, browser selectors, fixtures, tests and documentation
consume these same names. Host queue, Host state and message-metadata tests use
`opencraft-*.test.ts` names.

## Native and compatibility inputs

- `setup_codex_step`, `setup_codex_context_picker` and
  `item/tool/requestSetupCodexContextPicker` are native request names. Adapters
  preserve their wire spelling and map responses through the owned model.
- The projector accepts the former `interaction:setup-codex-step` as a read-only
  compatibility input and always emits `setup-step`. New runtime input and
  interaction responses use the canonical spelling.
- `isCodexAppThreadTool` explicitly checks the real `codex_app` namespace. Native
  tool names, result kinds (`codex` / `chatgpt`) and result fields remain intact;
  the presentation name is not a second tool namespace.
- `CODEX_*` user-message marker constants describe native prompt envelopes,
  including `My request for Codex` and `Prior conversation with Codex`. Parsing
  them does not rename user content.
- Generated protocol files, native error/approval metadata, `CODEX_HOME`, native
  executable and provider IDs, credential formats, transport options and actual
  engine-facing services retain accurate integration names.
- Existing SQLite paths, tables and published migration names/SQL retain their
  compatibility identities. Renaming a TypeScript schema constant does not
  migrate or recreate storage. Any future storage rename needs its own verified
  data migration; published migration text must never be rewritten.
- Existing Settings contribution IDs, Host IDs, saved theme aliases and native
  attachment metadata remain compatible. A CSS class is not a route or storage
  key. Native-engine tests and operational documentation retain the engine name
  where it identifies what they exercise.
- Previously saved inline-image transport labels remain readable without a
  migration; the compiler does not use them to select an engine. Native uploaded
  file IDs retain their existing metadata and protocol representation.

Local V3 replica scopes/epochs are rebuilt by the in-process compatibility
source; no native IDs or persisted V4 history are rewritten. Compiled document
nodes and activity summary keys are also derived presentation state. A full
client reload recreates them from source content.
