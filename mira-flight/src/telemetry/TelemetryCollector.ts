import {DroneAdapter} from '../adapters/DroneAdapter';
import {TelemetryPoint} from '../types/shared';

const MAX_BUFFER = 5000;

export class TelemetryCollector {
  private adapter: DroneAdapter;
  private buffer: TelemetryPoint[] = [];
  private unsubscribe: (() => void) | null = null;

  constructor(adapter: DroneAdapter) {
    this.adapter = adapter;
  }

  start(): void {
    this.unsubscribe = this.adapter.onTelemetry(point => {
      if (this.buffer.length < MAX_BUFFER) {
        this.buffer.push(point);
      }
    });
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  flush(): TelemetryPoint[] {
    const points = [...this.buffer];
    this.buffer = [];
    return points;
  }

  getBuffer(): TelemetryPoint[] {
    return this.buffer;
  }
}
