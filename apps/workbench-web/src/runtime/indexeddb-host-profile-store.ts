import type { RuntimeMachineIdentity } from "@opencraft/appserver-protocol";
import {
  normalizeHostConnectionProfile,
  type HostConnectionProfile,
  type HostConnectionProfileSnapshot,
  type HostConnectionProfileStore,
} from "@opencraft/workbench-runtime";

const DATABASE_VERSION = 2;
const PROFILE_STORE = "profiles";

export interface IndexedDbHostConnectionProfileStoreOptions {
  readonly databaseName?: string;
  readonly factory?: IDBFactory;
  readonly seed?: readonly HostConnectionProfile[];
  /** Activation-owned profiles visible for this run but never written to IDB. */
  readonly ephemeral?: readonly HostConnectionProfile[];
}

function requestResult<TResult>(request: IDBRequest<TResult>): Promise<TResult> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error ?? new Error("IndexedDB request failed")));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("abort", () => reject(transaction.error ?? new Error("IndexedDB transaction aborted")));
    transaction.addEventListener("error", () => reject(transaction.error ?? new Error("IndexedDB transaction failed")));
  });
}

export class IndexedDbHostConnectionProfileStore implements HostConnectionProfileStore {
  private readonly listeners = new Set<() => void>();
  private revision = 0;
  private snapshot: HostConnectionProfileSnapshot = { revision: 0, profiles: [] };
  private closed = false;
  private readonly ephemeralIds = new Set<string>();

  private constructor(private readonly database: IDBDatabase) {}

  static async open(
    options: IndexedDbHostConnectionProfileStoreOptions = {},
  ): Promise<IndexedDbHostConnectionProfileStore> {
    const factory = options.factory ?? indexedDB;
    const databaseName = options.databaseName ?? "vela-host-connections";
    const request = factory.open(databaseName, DATABASE_VERSION);
    request.addEventListener("upgradeneeded", () => {
      if (!request.result.objectStoreNames.contains("machines")) request.result.createObjectStore("machines");
      if (!request.result.objectStoreNames.contains(PROFILE_STORE)) {
        request.result.createObjectStore(PROFILE_STORE, { keyPath: "hostId" });
      }
    });
    const database = await requestResult(request);
    const store = new IndexedDbHostConnectionProfileStore(database);
    await store.load(options.seed ?? [], options.ephemeral ?? []);
    return store;
  }

  getSnapshot = (): HostConnectionProfileSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.ensureOpen();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async put(profile: HostConnectionProfile): Promise<void> {
    this.ensureOpen();
    let normalized = normalizeHostConnectionProfile(profile);
    const current = this.snapshot.profiles.find((candidate) => candidate.hostId === normalized.hostId);
    if (current) normalized = normalizeHostConnectionProfile({ ...normalized, machineIdentity: current.machineIdentity, agent: current.agent });
    if (current !== undefined && normalized.revision <= current.revision) {
      throw new Error(`Host profile ${normalized.hostId} revision must increase`);
    }
    if (this.ephemeralIds.has(normalized.hostId)) {
      this.publish(this.snapshot.profiles.map(profile => profile.hostId === normalized.hostId ? normalized : profile));
      return;
    }
    const transaction = this.database.transaction(PROFILE_STORE, "readwrite");
    const completion = transactionComplete(transaction);
    await requestResult(transaction.objectStore(PROFILE_STORE).put(structuredClone(normalized)));
    await completion;
    const profiles = this.snapshot.profiles.filter((candidate) => candidate.hostId !== normalized.hostId);
    profiles.push(normalized);
    this.publish(profiles);
  }

  async recordMachineIdentity(hostId: string, identity: RuntimeMachineIdentity | null, agent: "OpenCraft" | "Codex" | null = null): Promise<void> {
    this.ensureOpen();
    const current = this.snapshot.profiles.find(profile => profile.hostId === hostId);
    if (!current) return;
    const transaction = this.database.transaction("machines", "readwrite");
    const completion = transactionComplete(transaction);
    await requestResult(transaction.objectStore("machines").put({ machineIdentity: identity, agent }, hostId));
    await completion;
    // Identity is observation metadata; it never edits the connection recipe revision.
    this.publish(this.snapshot.profiles.map(profile => profile.hostId === hostId
      ? normalizeHostConnectionProfile({ ...profile, machineIdentity: identity, agent }) : profile));
  }

  async remove(hostId: string): Promise<boolean> {
    this.ensureOpen();
    const current = this.snapshot.profiles.find((candidate) => candidate.hostId === hostId);
    if (current === undefined) return false;
    const transaction = this.database.transaction([PROFILE_STORE, "machines"], "readwrite");
    const completion = transactionComplete(transaction);
    await requestResult(transaction.objectStore("machines").delete(hostId));
    await requestResult(transaction.objectStore(PROFILE_STORE).delete(hostId));
    await completion;
    this.ephemeralIds.delete(hostId);
    this.publish(this.snapshot.profiles.filter((candidate) => candidate.hostId !== hostId));
    return true;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.listeners.clear();
    this.database.close();
  }

  private async load(
    seed: readonly HostConnectionProfile[],
    ephemeral: readonly HostConnectionProfile[],
  ): Promise<void> {
    const transaction = this.database.transaction(PROFILE_STORE, "readonly");
    const completion = transactionComplete(transaction);
    const stored = await requestResult<unknown[]>(transaction.objectStore(PROFILE_STORE).getAll());
    await completion;
    let profiles = stored.map(normalizeHostConnectionProfile);
    if (profiles.length === 0 && seed.length > 0) {
      profiles = seed.map(normalizeHostConnectionProfile);
      const write = this.database.transaction(PROFILE_STORE, "readwrite");
      const writeCompletion = transactionComplete(write);
      for (const profile of profiles) {
        await requestResult(write.objectStore(PROFILE_STORE).put(structuredClone(profile)));
      }
      await writeCompletion;
    }
    const byId = new Map(profiles.map((profile) => [profile.hostId, profile]));
    for (const profile of ephemeral.map(normalizeHostConnectionProfile)) {
      if (byId.has(profile.hostId)) {
        throw new Error(`Ephemeral Host profile ${profile.hostId} conflicts with a stored profile`);
      }
      this.ephemeralIds.add(profile.hostId);
      byId.set(profile.hostId, profile);
    }
    const machines = this.database.transaction("machines", "readonly");
    const machineCompletion = transactionComplete(machines);
    const identities = await Promise.all([...byId.values()].map(async profile => {
      const cached = await requestResult(machines.objectStore("machines").get(profile.hostId));
      return normalizeHostConnectionProfile({ ...profile, ...(cached === undefined ? {} : cached) });
    }));
    await machineCompletion;
    this.publish(identities);
  }

  private ensureOpen(): void {
    if (this.closed) throw new Error("Host connection profile store is closed");
  }

  private publish(profiles: readonly HostConnectionProfile[]): void {
    this.snapshot = Object.freeze({
      revision: ++this.revision,
      profiles: Object.freeze([...profiles].sort((left, right) => left.displayName.localeCompare(right.displayName))),
    });
    for (const listener of this.listeners) listener();
  }
}
