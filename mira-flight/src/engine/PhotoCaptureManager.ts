import {DroneAdapter} from '../adapters/DroneAdapter';
import {Waypoint, PhotoUploadItem} from '../types/shared';

export type PhotoEnqueueCallback = (item: PhotoUploadItem) => void;

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
        const photos = await this.adapter.captureAllLenses();
        for (const photo of photos) {
          this.onEnqueue({
            missionId: this.missionId,
            localPath: photo.localPath,
            metadata: photo.metadata,
            waypointIndex: index,
          });
        }
        break;
      }
      case 'photo_zoom': {
        const photo = await this.adapter.capturePhoto('zoom');
        this.onEnqueue({
          missionId: this.missionId,
          localPath: photo.localPath,
          metadata: photo.metadata,
          waypointIndex: index,
        });
        break;
      }
      case 'photo_wide': {
        const photo = await this.adapter.capturePhoto('wide');
        this.onEnqueue({
          missionId: this.missionId,
          localPath: photo.localPath,
          metadata: photo.metadata,
          waypointIndex: index,
        });
        break;
      }
      case 'photo_thermal': {
        const photo = await this.adapter.capturePhoto('thermal');
        this.onEnqueue({
          missionId: this.missionId,
          localPath: photo.localPath,
          metadata: photo.metadata,
          waypointIndex: index,
        });
        break;
      }
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
}
