export type SyncStatus = 'idle' | 'syncing' | 'error' | 'unconfigured';

export type SyncStatusListener = (status: SyncStatus) => void;

export class SyncStateEmitter {
  private status: SyncStatus;
  private readonly listeners = new Set<SyncStatusListener>();

  constructor(initialStatus: SyncStatus = 'idle') {
    this.status = initialStatus;
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  setStatus(next: SyncStatus): void {
    if (this.status === next) return;
    this.status = next;
    this.listeners.forEach((listener) => listener(next));
  }

  subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
