import {DroneAdapter} from '../adapters/DroneAdapter';
import {MissionState, transition} from './MissionState';
import {PhotoCaptureManager} from './PhotoCaptureManager';
import {PhotoQueue} from '../upload/PhotoQueue';
import {UploadWorker} from '../upload/UploadWorker';
import {AnalysisTrigger} from '../upload/AnalysisTrigger';
import {TelemetryCollector} from '../telemetry/TelemetryCollector';
import {TelemetryUploader} from '../telemetry/TelemetryUploader';
import {Waypoint, PhotoUploadItem} from '../types/shared';
import {miraClient} from '../api/miraClient';

export type StateChangeCallback = (state: MissionState) => void;
export type ProgressCallback = (current: number, total: number) => void;
export type ErrorCallback = (error: Error) => void;

export class MissionEngine {
  private adapter: DroneAdapter;
  private state: MissionState = MissionState.IDLE;
  private photoQueue: PhotoQueue;
  private uploadWorker: UploadWorker;
  private analysisTrigger: AnalysisTrigger;
  private telemetryCollector: TelemetryCollector;
  private telemetryUploader: TelemetryUploader;
  private photoCaptureManager: PhotoCaptureManager | null = null;
  private waypoints: Waypoint[] = [];
  private missionId: string = '';

  private stateCallbacks: StateChangeCallback[] = [];
  private progressCallbacks: ProgressCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];

  private unsubWaypoint: (() => void) | null = null;
  private unsubComplete: (() => void) | null = null;

  constructor(adapter: DroneAdapter) {
    this.adapter = adapter;
    this.photoQueue = new PhotoQueue();
    this.uploadWorker = new UploadWorker(this.photoQueue);
    this.analysisTrigger = new AnalysisTrigger(this.photoQueue);
    this.telemetryCollector = new TelemetryCollector(adapter);
    this.telemetryUploader = new TelemetryUploader(this.telemetryCollector);
  }

  getState(): MissionState {
    return this.state;
  }

  private setState(newState: MissionState): void {
    this.state = transition(this.state, newState);
    for (const cb of this.stateCallbacks) {
      cb(this.state);
    }
  }

  onStateChange(cb: StateChangeCallback): () => void {
    this.stateCallbacks.push(cb);
    return () => {
      this.stateCallbacks = this.stateCallbacks.filter(c => c !== cb);
    };
  }

  onProgress(cb: ProgressCallback): () => void {
    this.progressCallbacks.push(cb);
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter(c => c !== cb);
    };
  }

  onError(cb: ErrorCallback): () => void {
    this.errorCallbacks.push(cb);
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter(c => c !== cb);
    };
  }

  async startMission(missionId: string, waypoints: Waypoint[], resume = false): Promise<void> {
    try {
      this.missionId = missionId;
      this.waypoints = waypoints;

      this.setState(MissionState.PREFLIGHT);

      const enqueue = (item: PhotoUploadItem) => {
        this.photoQueue.enqueue(item);
      };
      this.photoCaptureManager = new PhotoCaptureManager(
        this.adapter,
        missionId,
        enqueue,
      );

      if (!resume) {
        await miraClient.startMission(missionId);
      }
      await this.adapter.uploadWaypoints(waypoints);

      this.setState(MissionState.FLYING);

      await this.adapter.arm();
      await this.adapter.takeoff(waypoints[0]?.altitude_m ?? 30);

      this.telemetryCollector.start();
      this.telemetryUploader.start(missionId);
      this.uploadWorker.start(missionId);

      this.unsubWaypoint = this.adapter.onWaypointReached(async index => {
        for (const cb of this.progressCallbacks) {
          cb(index + 1, this.waypoints.length);
        }
        if (this.photoCaptureManager) {
          await this.photoCaptureManager.handleWaypointReached(
            index,
            this.waypoints,
          );
        }
      });

      this.unsubComplete = this.adapter.onMissionComplete(async () => {
        await this.onAllWaypointsComplete();
      });

      await this.adapter.startWaypointMission();
    } catch (err: any) {
      this.emitError(err);
      try {
        this.setState(MissionState.FAILED);
      } catch {}
    }
  }

  private async onAllWaypointsComplete(): Promise<void> {
    try {
      await this.adapter.returnToHome();

      this.setState(MissionState.UPLOADING);

      await this.photoQueue.waitForDrain();
      this.uploadWorker.stop();

      await miraClient.triggerAnalysis(this.missionId);
      this.setState(MissionState.ANALYZING);

      await this.pollAnalysis();

      const odmResult = await miraClient.triggerOdm(this.missionId);
      this.setState(MissionState.PROCESSING_3D);

      await this.pollOdm(this.missionId);

      this.setState(MissionState.COMPLETED);
    } catch (err: any) {
      this.emitError(err);
      try {
        this.setState(MissionState.FAILED);
      } catch {}
    } finally {
      this.cleanup();
    }
  }

  async abort(): Promise<void> {
    try {
      this.cleanup();
      await this.adapter.returnToHome();
      this.state = MissionState.ABORTED;
      for (const cb of this.stateCallbacks) {
        cb(this.state);
      }
    } catch (err: any) {
      this.emitError(err);
    }
  }

  private async pollAnalysis(): Promise<void> {
    for (let i = 0; i < 120; i++) {
      const status = await miraClient.getMissionStatus(this.missionId);
      if (
        status.status === 'analysis_complete' ||
        status.status === 'completed'
      ) {
        return;
      }
      if (status.status === 'failed') {
        throw new Error('Analysis failed');
      }
      await new Promise<void>(r => setTimeout(r, 5000));
    }
    throw new Error('Analysis timed out');
  }

  private async pollOdm(taskId: string): Promise<void> {
    for (let i = 0; i < 120; i++) {
      const status = await miraClient.getOdmStatus(taskId);
      if (status.status === 'completed') {
        return;
      }
      if (status.status === 'failed') {
        throw new Error('ODM processing failed');
      }
      await new Promise<void>(r => setTimeout(r, 5000));
    }
    throw new Error('ODM processing timed out');
  }

  private emitError(err: Error): void {
    for (const cb of this.errorCallbacks) {
      cb(err);
    }
  }

  private cleanup(): void {
    this.unsubWaypoint?.();
    this.unsubComplete?.();
    this.telemetryCollector.stop();
    this.telemetryUploader.stop();
    this.uploadWorker.stop();
  }
}
