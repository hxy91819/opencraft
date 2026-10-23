import { createRoot } from "react-dom/client";
import { useLayoutEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { IntlRuntimeProvider, useIntl } from "@opencraft/i18n/react";
import type { WebPreviewDocument } from "@opencraft/file-preview-web";
import { columnLabel, decodeDelimitedBytes, parseDelimited } from "./delimited-model";
import "./preview.web.scss";

function DelimitedTable({ rows, source, name }: { rows: string[][]; source: string; name: string }) {
  const intl = useIntl();
  const scroll = useRef<HTMLDivElement>(null);
  const [showSource, setShowSource] = useState(false);
  const columns = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const vertical = useVirtualizer({ count: rows.length, getScrollElement: () => scroll.current, estimateSize: () => 32, overscan: 8 });
  const horizontal = useVirtualizer({ count: columns, horizontal: true, getScrollElement: () => scroll.current, estimateSize: () => 180, overscan: 2, paddingStart: 48 });
  useLayoutEffect(() => { if (!showSource) { vertical.measure(); horizontal.measure(); } }, [showSource]);
  const visibleColumns = horizontal.getVirtualItems();
  return <div className="structured-preview structured-preview--table">
    <div className="structured-preview__toolbar">
      <button type="button" aria-pressed={!showSource} onClick={() => setShowSource(false)}>{intl.formatMessage({ id: "filePreview.table", defaultMessage: "Table" })}</button>
      <button type="button" aria-pressed={showSource} onClick={() => setShowSource(true)}>{intl.formatMessage({ id: "filePreview.source", defaultMessage: "Source" })}</button>
      <span>{intl.formatNumber(rows.length)} × {intl.formatNumber(columns)}</span>
    </div>
    <pre className="structured-preview__source" hidden={!showSource}>{source}</pre>
    <div ref={scroll} className="structured-preview__table-scroll" hidden={showSource} tabIndex={0} role="region" aria-label={name}>
      <div role="table" aria-label={name} aria-rowcount={rows.length + 1} aria-colcount={columns + 1} style={{ width: Math.max(48, horizontal.getTotalSize()), minWidth: "100%" }}>
        <div className="structured-preview__table-header" role="row" aria-rowindex={1}>
          <div className="structured-preview__row-number" role="columnheader">#</div>
          {visibleColumns.map(col => <div key={col.key} role="columnheader" aria-colindex={col.index + 2} style={{ left: col.start, width: col.size }}>{columnLabel(col.index)}</div>)}
        </div>
        <div style={{ height: vertical.getTotalSize(), position: "relative" }}>
          {vertical.getVirtualItems().map(row => <div key={row.key} className="structured-preview__table-row" role="row" aria-rowindex={row.index + 2} style={{ top: row.start, height: row.size }}>
            <div className="structured-preview__row-number" role="rowheader">{row.index + 1}</div>
            {visibleColumns.map(col => <div key={col.key} role="cell" aria-colindex={col.index + 2} style={{ left: col.start, width: col.size }} title={rows[row.index]?.[col.index] ?? ""}>{rows[row.index]?.[col.index] ?? ""}</div>)}
          </div>)}
        </div>
      </div>
    </div>
  </div>;
}

export async function openDelimited(input: { blob: Blob; name: string; signal: AbortSignal }): Promise<WebPreviewDocument> {
  const bytes = new Uint8Array(await input.blob.arrayBuffer());
  input.signal.throwIfAborted();
  const source = decodeDelimitedBytes(bytes);
  const rows = parseDelimited(source, /\.tsv$/iu.test(input.name) ? "\t" : ",");
  input.signal.throwIfAborted();
  const element = document.createElement("div");
  element.className = "structured-preview-host";
  const root = createRoot(element);
  let disposed = false;
  const dispose = () => { if (!disposed) { disposed = true; input.signal.removeEventListener("abort", dispose); root.unmount(); element.remove(); } };
  input.signal.addEventListener("abort", dispose, { once: true });
  return { element, dispose, setActive: active => { element.inert = !active; },
    setIntl(runtime) {
      if (!disposed) root.render(<IntlRuntimeProvider runtime={runtime}><DelimitedTable rows={rows} source={source} name={input.name} /></IntlRuntimeProvider>);
    },
  };
}
