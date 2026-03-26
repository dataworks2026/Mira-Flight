import {TelemetryCollector} from './TelemetryCollector';
import {miraClient} from '../api/miraClient';

export class TelemetryUploader {
  private collector: TelemetryCollector;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(collector: TelemetryCollector) {
    this.collector = collector;
  }

  start(): void {
    this.interval = setInterval(async () => {
      const points = this.collector.flush();
      if (points.length === 0) {
        return;
      }
      try {
        await miraClient.sendTelemetryBatch(points);
      } catch {
        // Keep buffering on failure (offline resilience)
        for (const p of points) {
          this.collector.getBuffer().push(p);
        }
      }
    }, 10000);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
