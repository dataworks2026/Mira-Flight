import {create} from 'zustand';
import {Mission, Waypoint} from '../types/shared';
import {MissionState} from '../engine/MissionState';

interface MissionStoreState {
  currentMission: Mission | null;
  missionState: MissionState;
  waypointCurrent: number;
  waypointTotal: number;
  photosCount: number;
  uploadedCount: number;
  analyzedCount: number;
  waypoints: Waypoint[];

  setMission: (mission: Mission | null) => void;
  updateState: (state: MissionState) => void;
  setProgress: (current: number, total: number) => void;
  incrementPhotos: (count?: number) => void;
  setUploadedCount: (count: number) => void;
  setAnalyzedCount: (count: number) => void;
  setWaypoints: (waypoints: Waypoint[]) => void;
  reset: () => void;
}

export const useMissionStore = create<MissionStoreState>(set => ({
  currentMission: null,
  missionState: MissionState.IDLE,
  waypointCurrent: 0,
  waypointTotal: 0,
  photosCount: 0,
  uploadedCount: 0,
  analyzedCount: 0,
  waypoints: [],

  setMission: mission => set({currentMission: mission}),
  updateState: state => set({missionState: state}),
  setProgress: (current, total) =>
    set({waypointCurrent: current, waypointTotal: total}),
  incrementPhotos: (count = 1) =>
    set(s => ({photosCount: s.photosCount + count})),
  setUploadedCount: count => set({uploadedCount: count}),
  setAnalyzedCount: count => set({analyzedCount: count}),
  setWaypoints: waypoints => set({waypoints}),
  reset: () =>
    set({
      currentMission: null,
      missionState: MissionState.IDLE,
      waypointCurrent: 0,
      waypointTotal: 0,
      photosCount: 0,
      uploadedCount: 0,
      analyzedCount: 0,
      waypoints: [],
    }),
}));
