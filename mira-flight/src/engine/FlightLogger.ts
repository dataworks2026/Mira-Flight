import RNFS from 'react-native-fs';
import {FlightLog, FlightMilestone, MilestoneType} from '../types/shared';
import {miraClient} from '../api/miraClient';
import {miraLog} from '../store/logStore';

const TAG = 'FlightLogger';

export class FlightLogger {
  private readonly missionId: string;
  private readonly startTs: number;
  private readonly dir: string;
  private readonly logPath: string;
  private milestones: FlightMilestone[] = [];

  constructor(missionId: string) {
    this.missionId = missionId;
    this.startTs = Date.now();
    this.dir = `${RNFS.DocumentDirectoryPath}/missions/${missionId}`;
    this.logPath = `${this.dir}/flight_log.json`;
  }

  record(type: MilestoneType, data?: Record<string, unknown>): void {
    this.milestones.push({type, ts: Date.now(), data});
    miraLog('debug', TAG, `milestone: ${type}`);
  }

  async save(endTs?: number): Promise<void> {
    const log: FlightLog = {
      mission_id: this.missionId,
      schema_version: 1,
      start_ts: this.startTs,
      end_ts: endTs ?? Date.now(),
      milestones: this.milestones,
    };
    try {
      await RNFS.mkdir(this.dir);
      await RNFS.writeFile(this.logPath, JSON.stringify(log, null, 2), 'utf8');
      miraLog('info', TAG, `saved to ${this.logPath}`);
    } catch (e: unknown) {
      miraLog('error', TAG, `save failed: ${String(e)}`);
    }
  }

  async upload(): Promise<void> {
    const log: FlightLog = {
      mission_id: this.missionId,
      schema_version: 1,
      start_ts: this.startTs,
      end_ts: Date.now(),
      milestones: this.milestones,
    };
    try {
      await miraClient.uploadFlightLog(this.missionId, log);
      miraLog('info', TAG, 'flight log uploaded');
    } catch (e: unknown) {
      miraLog('warn', TAG, `upload failed (non-fatal): ${String(e)}`);
    }
  }
}
