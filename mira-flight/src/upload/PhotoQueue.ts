import {PhotoUploadItem} from '../types/shared';

export class PhotoQueue {
  private queue: PhotoUploadItem[] = [];
  private drainCallbacks: (() => void)[] = [];

  enqueue(item: PhotoUploadItem): void {
    this.queue.push(item);
  }

  dequeue(): PhotoUploadItem | undefined {
    return this.queue.shift();
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  size(): number {
    return this.queue.length;
  }

  onDrained(callback: () => void): () => void {
    this.drainCallbacks.push(callback);
    return () => {
      this.drainCallbacks = this.drainCallbacks.filter(cb => cb !== callback);
    };
  }

  notifyDrained(): void {
    for (const cb of this.drainCallbacks) {
      cb();
    }
  }

  waitForDrain(): Promise<void> {
    if (this.isEmpty()) {
      return Promise.resolve();
    }
    return new Promise(resolve => {
      const unsub = this.onDrained(() => {
        unsub();
        resolve();
      });
    });
  }
}
