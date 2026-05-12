import {useDroneStore} from '../store/droneStore';
import {TelemetryPoint} from '../types/shared';

export function updateTelemetryStore(point: TelemetryPoint): void {
  useDroneStore.getState().updateFromTelemetry(point);
}
