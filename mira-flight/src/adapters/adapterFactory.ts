import {DroneAdapter} from './DroneAdapter';
import {MockAdapter} from './MockAdapter';
import {ArduPilotAdapter} from './ArduPilotAdapter';
import {ConnectionConfig} from '../store/connectionStore';

export function createAdapter(config: ConnectionConfig): DroneAdapter {
  switch (config.adapterType) {
    case 'sitl':
      return new ArduPilotAdapter(
        config.sitlHost || '10.0.2.2',
        config.sitlPort,
      );
    case 'dji':
      // DJI adapter will be wired in E-2 once the native bridge is built
      return new MockAdapter();
    case 'mock':
    default:
      return new MockAdapter();
  }
}
