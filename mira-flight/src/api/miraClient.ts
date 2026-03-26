import axios, {AxiosInstance, AxiosError} from 'axios';
import {
  Mission,
  Waypoint,
  TelemetryPoint,
  AuthResponse,
  PhotoMetadata,
} from '../types/shared';

const BASE_URL = 'http://3.144.48.124:8000/api/v1';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

function createAxiosInstance(): AxiosInstance {
  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
  });

  instance.interceptors.request.use(config => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  });

  instance.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config as any;
    if (!config || config._retryCount >= 3) {
      return Promise.reject(error);
    }
    config._retryCount = (config._retryCount || 0) + 1;
    const delay = Math.pow(2, config._retryCount) * 1000;
    await new Promise<void>(r => setTimeout(r, delay));
    return instance(config);
  });

  return instance;
}

const api = createAxiosInstance();

export const miraClient = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const {data} = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    setAuthToken(data.access_token);
    return data;
  },

  async createMission(mission: Partial<Mission>): Promise<Mission> {
    const {data} = await api.post<Mission>('/missions', mission);
    return data;
  },

  async getMission(missionId: string): Promise<Mission> {
    const {data} = await api.get<Mission>(`/missions/${missionId}`);
    return data;
  },

  async getMissions(): Promise<Mission[]> {
    const {data} = await api.get<Mission[]>('/missions');
    return data;
  },

  async startMission(missionId: string): Promise<Mission> {
    const {data} = await api.post<Mission>(`/missions/${missionId}/start`);
    return data;
  },

  async completeMission(missionId: string): Promise<Mission> {
    const {data} = await api.post<Mission>(`/missions/${missionId}/complete`);
    return data;
  },

  async updateWaypoints(
    missionId: string,
    waypoints: Waypoint[],
  ): Promise<void> {
    await api.put(`/missions/${missionId}/waypoints`, {waypoints});
  },

  async getMissionStatus(
    missionId: string,
  ): Promise<{status: string; progress?: number}> {
    const {data} = await api.get(`/missions/${missionId}/status`);
    return data;
  },

  async uploadMissionImage(
    missionId: string,
    filePath: string,
    metadata: PhotoMetadata,
  ): Promise<{id: string}> {
    const formData = new FormData();
    formData.append('file', {
      uri: filePath,
      type: 'image/jpeg',
      name: filePath.split('/').pop() || 'photo.jpg',
    } as any);
    formData.append('metadata', JSON.stringify(metadata));

    const {data} = await api.post(
      `/missions/${missionId}/images/upload`,
      formData,
      {headers: {'Content-Type': 'multipart/form-data'}},
    );
    return data;
  },

  async triggerAnalysis(missionId: string): Promise<void> {
    await api.post(`/missions/${missionId}/analyze-all`);
  },

  async sendTelemetryBatch(points: TelemetryPoint[]): Promise<void> {
    await api.post('/telemetry/batch', {points});
  },

  async triggerOdm(missionId: string): Promise<{task_id: string}> {
    const {data} = await api.post('/odm/process', {mission_id: missionId});
    return data;
  },

  async getOdmStatus(
    taskId: string,
  ): Promise<{status: string; progress?: number}> {
    const {data} = await api.get(`/odm/status/${taskId}`);
    return data;
  },

  async processThermal(
    missionId: string,
    imageId: string,
  ): Promise<{hotspots: any[]}> {
    const {data} = await api.post('/thermal/process', {
      mission_id: missionId,
      image_id: imageId,
    });
    return data;
  },
};
