import {DroneAdapter} from './DroneAdapter';
import {MockAdapter} from './MockAdapter';
import {ArduPilotAdapter} from './ArduPilotAdapter';
import {DJIAdapter} from './DJIAdapter';
import {ConnectionConfig} from '../store/connectionStore';

export function createAdapter(config: ConnectionConfig): DroneAdapter {
  switch (config.adapterType) {
    case 'sitl':
      return new ArduPilotAdapter(
        config.sitlHost || '10.0.2.2',
        config.sitlPort,
      );
    case 'dji':
      return new DJIAdapter();
    case 'mock':
    default:
      return new MockAdapter();
  }
}
