import { createWorkbenchWebServer } from '../workbench-web-server.mjs';
import { inspectRelease } from './releases.mjs';
const identity = await inspectRelease(process.env.OPENCRAFT_RELEASE_ROOT);
const server = await createWorkbenchWebServer({ root: `${identity.releaseRoot}/web`, appServerTarget: process.env.OPENCRAFT_APPSERVER_URL || null,
  codexServerTarget: process.env.OPENCRAFT_CODEX_APPSERVER_URL || null, hyperNodeUser: process.env.OPENCRAFT_HYPERNODE_USER || '' });
const address = await server.listen({ host: '127.0.0.1', port: 0 });
process.send?.({ protocol: 1, port: address.port, version: identity.version, buildId: identity.buildId });
const close = async () => { await server.close(); process.exit(0); };
process.once('SIGTERM', close); process.once('SIGINT', close); process.once('disconnect', close);
