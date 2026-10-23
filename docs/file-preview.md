# Read-only file previews

The existing resource panel reads bytes through the Host and owns the download
of the original file. Registered adapters route DOCX, PPTX, XLSX, XLS, XLSM,
CSV/TSV, Draw.io/DIO, Excalidraw and standalone `.mmd`/`.mermaid` files into
`FilePreviewView`. PDF, HTML, Markdown, code and the file-tree policy retain
their existing renderers. Embedded read-only workspaces use the same byte-to-view
path. Legacy DOC/PPT, password-protected files, macro execution, editing and
writeback are outside this slice. Lightweight engines provide useful previews,
not an Office layout-fidelity guarantee.

## Supported format behavior

- CSV/TSV preserve text rather than coercing numbers, dates or formula strings.
  UTF-8, BOM-marked UTF-16 and GB18030 fallback decoding support common exports.
  Quoted delimiters, escaped quotes and embedded newlines are parsed; malformed
  quoting is a retryable preview error. A virtual table includes row/column
  headings, horizontal/vertical scrolling and an escaped source view. Admission
  is bounded to 100,000 rows, 4,096 columns and 1,000,000 cells.
- XLS is admitted as legacy OLE rather than an OOXML ZIP. XLS/XLSM reuse the
  packaged spreadsheet engine and worksheet navigation. Macro execution is
  disabled. The engine's legacy-format support is limited; unusual objects or
  workbook-specific features may be omitted. Invalid files retain download.
- Draw.io/DIO accept `mxGraphModel` and `mxfile` containers, compressed or plain
  pages. Raw-DEFLATE URI-encoded pages are normalized with 16 MiB expanded XML,
  100-page and 50,000-cell limits. A pinned Draw.io static viewer is packaged
  locally in an opaque-origin iframe with scripts restricted to the packaged
  runtime, no outbound connections and no document link navigation. Page,
  zoom and layer controls remain available. Optional remote math rendering is
  disabled; the packaged static viewer runs without an external executable.
- Excalidraw uses its independent library's scene restore/SVG export path,
  supports packaged scene images and fonts, and rejects scenes over 20,000
  elements. Embeddable live content is disabled. Exported SVG is sanitized before
  display, with no external links or images.
- Standalone Mermaid files use chat's engine configuration and shared low-level
  serialization gate, avoiding global theme races. The file view is a diagram,
  with fit/zoom/pan, keyboard controls and touch interaction. Source is bounded
  to 100,000 characters. Parse errors retain original download and retry.

## Ownership and replacement

`file-preview-core` owns a bounded pool. Identity consists of Workbench owner,
tab, Host/resource identity (including runtime generation), Blob revision and
adapter registration generation. The Host-scoped query cache owns loaded bytes;
the pool does not create a filesystem or global path cache. Mutable renderers are
never shared across tabs, owners or runtime generations. Blob identity is a
revision token for an immutable query result, not a disk change watcher.

A lease attaches one document to a Web view. Detaching a ready view retains it
for recent navigation; abandoning an opening/failed view cancels it. Close,
preview replacement, owner disposal and adapter unregister revoke ownership.
Every late result is disposed rather than published. An adapter may only support
logical cancellation (DOCX parsing); it must still dispose its detached work on
completion. The pool aborts an opening attempt after 45 seconds. Failure occupies
the existing viewer area, leaves download available, and offers explicit retry.

The initial global pool admits three engine instances and 64 MiB of source
bytes, with an individual file limit of 25 MiB. Only idle instances may be evicted,
in LRU order; active views reject excess admission rather than disappear. These
are source/admission bounds, not a precise bound on third-party heap memory.
Eviction discards engine reading state; retained instances keep their own state.
ZIP admission rejects encrypted/ZIP64 archives, over 4,000 entries, entries over
32 MiB, total expanded size over 64 MiB and external resource relationships.
Document hyperlinks do not navigate the application. No document macros run.

## Replaceable adapters and deployment

The built-in registry accepts an extension list and asynchronous `open` operation
returning an element, idempotent dispose and optional activation/theme/failure hooks.
An engine failure after readiness transitions the same session to a retryable
failed state and releases the broken view; it cannot silently leave a ready blank.
DOCX uses docx-preview 0.4.1, PPTX uses @aiden0z/pptx-renderer 1.3.0 and spreadsheets use
@extend-ai/react-xlsx 0.17.2 with explicitly read-only controls, Worker parsing and
packaged WASM. XLSX sheet navigation remains available when the default toolbar
is hidden. No global cross-origin-isolation header is required by these adapters.

Engine code is dynamically imported only after its preview is requested.
The build's optional-resource manifest follows emitted chunk ownership; shared
static dependencies remain available to existing consumers. The existing
versioned resource preparation endpoint installs optional assets before import.
A self-contained static build remains runnable. Package creation includes the
runtime dependency license closure, including the spreadsheet WASM engine.

Verification: `tests/file-preview-core.test.ts`, `tests/structured-preview.test.ts`,
`scripts/smoke-office-preview.ts`, `scripts/smoke-structured-preview.ts`
and the packaged resource cold-start/retry/offline smoke cover ownership and
actual engine output. A new adapter must satisfy cancellation and disposal before
it can replace an engine; an engine-specific cache must not become a second
resource identity authority.
