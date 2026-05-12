import {PhotoQueue} from './PhotoQueue';
import {miraClient} from '../api/miraClient';

export class UploadWorker {
  private queue: PhotoQueue;
  private running = false;
  private interval: ReturnType<typeof setInterval> | null = null;
  public uploadedCount = 0;

  constructor(queue: PhotoQueue) {
    this.queue = queue;
  }

  start(missionId: string): void {
    this.running = true;
    this.uploadedCount = 0;
    this.processLoop(missionId);
  }

  stop(): void {
    this.running = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async processLoop(missionId: string): Promise<void> {
    while (this.running) {
      if (this.queue.isEmpty()) {
        await new Promise<void>(r => setTimeout(r, 500));
        if (this.queue.isEmpty() && !this.running) {
          this.queue.notifyDrained();
          break;
        }
        continue;
      }

      const item = this.queue.dequeue();
      if (!item) {
        continue;
      }

      let success = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await miraClient.uploadMissionImage(
            missionId,
            item.localPath,
            item.metadata,
          );
          this.uploadedCount++;
          success = true;
          break;
        } catch {
          await new Promise<void>(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        }
      }

      if (!success) {
        this.queue.enqueue(item);
      }

      if (this.queue.isEmpty()) {
        this.queue.notifyDrained();
      }
    }
  }
}
