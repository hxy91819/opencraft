import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import type { CodexAccountPoolProxy } from "./codex-proxy.js";

const MAX_REQUEST_BYTES = 10 * 1024 * 1024;

function requestHeaders(request: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === "string") headers.set(name, value);
    else if (Array.isArray(value)) for (const entry of value) headers.append(name, entry);
  }
  return headers;
}

async function requestBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const raw of request) {
    const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    size += chunk.byteLength;
    if (size > MAX_REQUEST_BYTES) throw new RangeError("Request too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function startCodexAccountPoolServer(options: {
  readonly proxy: CodexAccountPoolProxy;
  readonly host?: string;
  readonly port?: number;
}): Promise<{ readonly url: string; close(): Promise<void> }> {
  const host = options.host ?? "127.0.0.1";
  if (host !== "127.0.0.1" && host !== "::1") throw new TypeError("Account Pool server must bind to loopback");
  const active = new Set<Promise<void>>();
  const handle = async (incoming: IncomingMessage, outgoing: ServerResponse): Promise<void> => {
    const abort = new AbortController();
    const onAborted = () => abort.abort(new Error("Account Pool client disconnected"));
    incoming.once("aborted", onAborted);
    outgoing.once("close", () => { if (!outgoing.writableEnded) onAborted(); });
    try {
      const body = ["GET", "HEAD"].includes(incoming.method ?? "GET") ? undefined : await requestBody(incoming);
      const authority = incoming.headers.host ?? `${host}:${options.port ?? 0}`;
      const response = await options.proxy.handle(new Request(`http://${authority}${incoming.url ?? "/"}`, {
        method: incoming.method ?? "GET",
        headers: requestHeaders(incoming),
        ...(body === undefined ? {} : { body: body.toString("utf8") }),
        signal: abort.signal,
      }));
      outgoing.statusCode = response.status;
      outgoing.statusMessage = response.statusText;
      for (const [name, value] of response.headers) outgoing.setHeader(name, value);
      if (response.body === null) outgoing.end();
      else await pipeline(
        Readable.fromWeb(response.body as unknown as import("node:stream/web").ReadableStream),
        outgoing,
      );
    } catch (error) {
      if (outgoing.headersSent) {
        if (!outgoing.destroyed) outgoing.destroy(error instanceof Error ? error : new Error(String(error)));
      } else {
        const status = error instanceof RangeError ? 413 : 502;
        outgoing.writeHead(status, { "content-type": "application/json" });
        outgoing.end(JSON.stringify({ error: { message: status === 413 ? "Request too large" : "Account Pool request failed" } }));
      }
    }
  };
  const server = createServer((incoming, outgoing) => {
    const operation = handle(incoming, outgoing);
    active.add(operation);
    void operation.finally(() => active.delete(operation)).catch(error => {
      if (!outgoing.destroyed) outgoing.destroy(error instanceof Error ? error : new Error(String(error)));
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 0, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Account Pool server did not bind a TCP port");
  const displayHost = address.family === "IPv6" ? `[${address.address}]` : address.address;
  let closing: Promise<void> | null = null;
  return {
    url: `http://${displayHost}:${address.port}`,
    close: () => closing ??= (async () => {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      // An aborted socket can close before OAuth refresh finishes. Its handler
      // must finish persisting credentials before the owner closes storage.
      await Promise.allSettled(active);
    })(),
  };
}
