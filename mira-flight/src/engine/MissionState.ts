export enum MissionState {
  IDLE = 'IDLE',
  PREFLIGHT = 'PREFLIGHT',
  FLYING = 'FLYING',
  PAUSED = 'PAUSED',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  PROCESSING_3D = 'PROCESSING_3D',
  COMPLETED = 'COMPLETED',
  ABORTED = 'ABORTED',
  FAILED = 'FAILED',
}

const VALID_TRANSITIONS: Record<MissionState, MissionState[]> = {
  [MissionState.IDLE]: [MissionState.PREFLIGHT, MissionState.FAILED],
  [MissionState.PREFLIGHT]: [MissionState.FLYING, MissionState.ABORTED, MissionState.FAILED],
  [MissionState.FLYING]: [
    MissionState.PAUSED,
    MissionState.UPLOADING,
    MissionState.ABORTED,
    MissionState.FAILED,
  ],
  [MissionState.PAUSED]: [MissionState.FLYING, MissionState.ABORTED, MissionState.FAILED],
  [MissionState.UPLOADING]: [MissionState.ANALYZING, MissionState.FAILED],
  [MissionState.ANALYZING]: [MissionState.PROCESSING_3D, MissionState.FAILED],
  [MissionState.PROCESSING_3D]: [MissionState.COMPLETED, MissionState.FAILED],
  [MissionState.COMPLETED]: [],
  [MissionState.ABORTED]: [],
  [MissionState.FAILED]: [MissionState.IDLE],
};

export function canTransition(from: MissionState, to: MissionState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transition(from: MissionState, to: MissionState): MissionState {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid transition: ${from} -> ${to}`);
  }
  return to;
}
