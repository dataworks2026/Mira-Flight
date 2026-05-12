import {PhotoQueue} from './PhotoQueue';
import {miraClient} from '../api/miraClient';

export class AnalysisTrigger {
  private queue: PhotoQueue;
  private polling = false;

  constructor(queue: PhotoQueue) {
    this.queue = queue;
  }

  async waitAndTrigger(missionId: string): Promise<void> {
    await this.queue.waitForDrain();
    await miraClient.triggerAnalysis(missionId);
    await this.pollUntilComplete(missionId);
  }

  private async pollUntilComplete(missionId: string): Promise<void> {
    this.polling = true;
    while (this.polling) {
      const status = await miraClient.getMissionStatus(missionId);
      if (
        status.status === 'analysis_complete' ||
        status.status === 'completed'
      ) {
        this.polling = false;
        return;
      }
      if (status.status === 'failed') {
        this.polling = false;
        throw new Error('Analysis failed');
      }
      await new Promise<void>(r => setTimeout(r, 5000));
    }
  }

  stop(): void {
    this.polling = false;
  }
}
