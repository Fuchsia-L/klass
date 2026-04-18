import { SyncStateEmitter } from './sync-state';
import type { SyncStatus } from './sync-state';

describe('SyncStateEmitter', () => {
  it('defaults to idle and exposes getStatus', () => {
    const emitter = new SyncStateEmitter();
    expect(emitter.getStatus()).toBe<SyncStatus>('idle');
  });

  it('accepts an explicit initial status', () => {
    const emitter = new SyncStateEmitter('unconfigured');
    expect(emitter.getStatus()).toBe<SyncStatus>('unconfigured');
  });

  it('notifies subscribers when status changes', () => {
    const emitter = new SyncStateEmitter();
    const listener = jest.fn();
    emitter.subscribe(listener);

    emitter.setStatus('syncing');
    emitter.setStatus('idle');

    expect(listener).toHaveBeenNthCalledWith(1, 'syncing');
    expect(listener).toHaveBeenNthCalledWith(2, 'idle');
  });

  it('does not notify when status is unchanged', () => {
    const emitter = new SyncStateEmitter('idle');
    const listener = jest.fn();
    emitter.subscribe(listener);

    emitter.setStatus('idle');

    expect(listener).not.toHaveBeenCalled();
  });

  it('stops notifying after unsubscribe', () => {
    const emitter = new SyncStateEmitter();
    const listener = jest.fn();
    const unsubscribe = emitter.subscribe(listener);

    emitter.setStatus('syncing');
    unsubscribe();
    emitter.setStatus('error');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('syncing');
  });
});
