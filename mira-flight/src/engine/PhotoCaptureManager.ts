import RNFS from 'react-native-fs';
import {DroneAdapter} from '../adapters/DroneAdapter';
import {Waypoint, PhotoUploadItem, CameraLens, CapturedPhoto} from '../types/shared';
import {miraLog} from '../store/logStore';

export type PhotoEnqueueCallback = (item: PhotoUploadItem) => void;

const MIN_FREE_BYTES = 100 * 1024 * 1024; // 100 MB
const TAG = 'PhotoCaptureMgr';

export class PhotoCaptureManager {
  private adapter: DroneAdapter;
  private missionId: string;
  private onEnqueue: PhotoEnqueueCallback;

  constructor(
    adapter: DroneAdapter,
    missionId: string,
    onEnqueue: PhotoEnqueueCallback,
  ) {
    this.adapter = adapter;
    this.missionId = missionId;
    this.onEnqueue = onEnqueue;
  }

  async handleWaypointReached(
    index: number,
    waypoints: Waypoint[],
  ): Promise<void> {
    const wp = waypoints[index];
    if (!wp) {
      return;
    }

    switch (wp.action) {
      case 'photo_all': {
        const photos = await this.captureAllWithStorage();
        for (const photo of photos) {
          let finalPath = photo.localPath;
          try {
            finalPath = await this.moveToMissionDir(
              photo.localPath,
              index,
              photo.metadata.camera_lens,
            );
          } catch (e) {
            miraLog('warn', TAG, `move failed wp${index} ${photo.metadata.camera_lens}: ${String(e)}`);
          }
          this.onEnqueue({
            missionId: this.missionId,
            localPath: finalPath,
            metadata: photo.metadata,
            waypointIndex: index,
          });
        }
        break;
      }
      case 'photo_zoom':
        await this.captureAndEnqueue('zoom', index);
        break;
      case 'photo_wide':
        await this.captureAndEnqueue('wide', index);
        break;
      case 'photo_thermal':
        await this.captureAndEnqueue('thermal', index);
        break;
      case 'hover':
        if (wp.hover_time_s) {
          await new Promise<void>(r => setTimeout(r, wp.hover_time_s! * 1000));
        }
        break;
      case 'none':
      default:
        break;
    }
  }

  private async captureAndEnqueue(
    lens: CameraLens,
    index: number,
  ): Promise<void> {
    const hasSpace = await this.checkStorage();
    if (!hasSpace) {
      return;
    }
    const photo = await this.adapter.capturePhoto(lens);
    let finalPath = photo.localPath;
    try {
      finalPath = await this.moveToMissionDir(photo.localPath, index, lens);
    } catch (e) {
      miraLog('warn', TAG, `move failed wp${index} ${lens}: ${String(e)}`);
    }
    this.onEnqueue({
      missionId: this.missionId,
      localPath: finalPath,
      metadata: photo.metadata,
      waypointIndex: index,
    });
  }

  private async captureAllWithStorage(): Promise<CapturedPhoto[]> {
    const hasSpace = await this.checkStorage();
    if (!hasSpace) {
      return [];
    }
    return this.adapter.captureAllLenses();
  }

  private async checkStorage(): Promise<boolean> {
    try {
      const info = await RNFS.getFSInfo();
      if (info.freeSpace < MIN_FREE_BYTES) {
        miraLog(
          'error',
          TAG,
          `low storage: ${Math.round(info.freeSpace / 1024 / 1024)} MB free — skipping capture`,
        );
        return false;
      }
      return true;
    } catch (e) {
      miraLog('warn', TAG, `getFSInfo failed: ${String(e)}`);
      return true; // assume ok if check itself fails
    }
  }

  private async moveToMissionDir(
    tempPath: string,
    index: number,
    lens: CameraLens,
  ): Promise<string> {
    const dir = `${RNFS.DocumentDirectoryPath}/missions/${this.missionId}/photos`;
    await RNFS.mkdir(dir);
    const dest = `${dir}/wp${index}_${lens}.jpg`;
    const src = tempPath.startsWith('file://') ? tempPath.slice(7) : tempPath;
    await RNFS.moveFile(src, dest);
    return `file://${dest}`;
  }
}
