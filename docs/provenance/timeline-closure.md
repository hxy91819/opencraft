# Timeline source closure: current boundaries

The package's former provenance explicitly describes a typed restoration of
the recovered follow reducer and history-loading mechanism. Review located
both named source regions; [bindings](timeline-closure-sources.json) preserve
the fixed reference hashes and accepted target hashes before treatment.
Other files are recorded for further review, not classified as copied solely
because they share the package.

## Replaced regions

The history coordinator now owns queued fill requests. It publishes its running
slot before invoking the loader, coalesces obsolete waiting owners into the
latest fill, and retains the slot through the host layout barrier. This replaces
the former active-generation recursion. Public ports, same-owner completion
identity, error reporting, no-progress termination and single-flight behavior
remain. Synchronous reentrant requests now share that already-published slot;
the accepted former implementation performed two loads for the same scenario.

The follow reducer now separates lifecycle/geometry signal classification from
a declarative transition matrix. Stable public checkpoint modes remain; omitted
matrix cells preserve ownership. Placement, removal and explicit bottom commands
project directly to their intended owner. This replaces the recovered imperative
`OD` control flow, retaining OpenCraft's later response-watch behavior.

The author inspected the old code and references; this is not a clean-room
assertion. Replacement scope is these two current regions, not all geometry,
animation, scroll/measurement implementations or historical Git objects.

## Verification and remaining work

The focused timeline/React/Web/Native suite passes 150 cases. Two added request
scenarios verify synchronous reentrancy and multiple queued ownership changes.
The callback-fixture metrics now use the actual `TurnViewportMetrics` field
names; the prior fixture supplied unrelated fields and never loaded a page.
A private differential against the accepted public API verified 255 finite
follow transitions and their identity/no-op behavior. It also reproduces the
old two-load reentrancy outcome against the new one-load result.

Web, React adapter, renderer-neutral and Expo type checks pass. The focused real
Conversation browser check passed both scroll policies with actual
ResizeObserver/layout delivery and history filling after content shrink.
A full viewport loaded no pages; committed shrink loaded exactly one page;
an unrelated rerender loaded none. Run `npm run smoke:history-fill` to reproduce. Geometry/measurement/controller review and the adapter-wide
disposition remain open in the five-group inventory.
