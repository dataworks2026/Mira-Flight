import React, {useEffect, useRef, useCallback, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import MapView, {Marker, Polyline} from 'react-native-maps';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useDrone} from '../adapters/DroneAdapter';
import {useDroneStore} from '../store/droneStore';
import {useMissionStore} from '../store/missionStore';
import {MissionEngine} from '../engine/MissionEngine';
import {MissionState} from '../engine/MissionState';
import {updateTelemetryStore} from '../telemetry/TelemetryStore';
import {RootStackParamList} from '../App';
import LiveVideoPlayer from '../components/LiveVideoPlayer';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const C = {
  bg: '#0A0E14',
  panel: '#131822',
  card: '#1E2530',
  brand: '#00D4FF',
  healthy: '#10B981',
  warn: '#F59E0B',
  critical: '#EF4444',
  info: '#3B82F6',
  text1: '#F8FAFC',
  text2: '#94A3B8',
  text3: '#475569',
};

function formatElapsed(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function HudScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<any>();
  const missionId = route.params?.missionId;
  const adapter = useDrone();
  const {width, height} = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = Math.min(width, height) >= 600;
  const isTabletLandscape = isTablet && isLandscape;

  const lat = useDroneStore(s => s.lat);
  const lon = useDroneStore(s => s.lon);
  const alt = useDroneStore(s => s.alt);
  const speed = useDroneStore(s => s.speed);
  const battery = useDroneStore(s => s.battery);
  const satellites = useDroneStore(s => s.satellites);
  const heading = useDroneStore(s => s.heading);

  const currentMission = useMissionStore(s => s.currentMission);
  const missionState = useMissionStore(s => s.missionState);
  const waypointCurrent = useMissionStore(s => s.waypointCurrent);
  const waypointTotal = useMissionStore(s => s.waypointTotal);
  const photosCount = useMissionStore(s => s.photosCount);
  const waypoints = useMissionStore(s => s.waypoints);
  const updateState = useMissionStore(s => s.updateState);
  const setProgress = useMissionStore(s => s.setProgress);
  const incrementPhotos = useMissionStore(s => s.incrementPhotos);

  const engineRef = useRef<MissionEngine | null>(null);
  const unsubTelemetryRef = useRef<(() => void) | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startMission = useCallback(async () => {
    const isResume = currentMission?.status === 'in_progress';
    const engine = new MissionEngine(adapter);
    engineRef.current = engine;

    unsubTelemetryRef.current = adapter.onTelemetry(updateTelemetryStore);

    engine.onStateChange(state => {
      updateState(state);
      if (state === MissionState.COMPLETED) {
        navigation.navigate('MissionReview', {missionId});
      }
    });

    engine.onProgress((current, total) => {
      setProgress(current, total);
      incrementPhotos();
    });

    await adapter.connect();
    useDroneStore.getState().setConnected(true);
    await engine.startMission(missionId, waypoints, isResume);
  }, [adapter, missionId, waypoints, currentMission, navigation, updateState, setProgress, incrementPhotos]);

  useEffect(() => {
    startMission();
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => {
      unsubTelemetryRef.current?.();
      engineRef.current?.abort();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAbort = async () => {
    await engineRef.current?.abort();
    updateState(MissionState.ABORTED);
    navigation.navigate('Home');
  };

  const handleRTH = async () => {
    await engineRef.current?.abort();
    navigation.navigate('Home');
  };

  const droneCoord = lat !== 0 ? {latitude: lat, longitude: lon} : null;
  const mapRegion = droneCoord
    ? {...droneCoord, latitudeDelta: 0.003, longitudeDelta: 0.003}
    : {latitude: 39.9612, longitude: -82.9988, latitudeDelta: 0.01, longitudeDelta: 0.01};

  const progressPct = waypointTotal > 0 ? (waypointCurrent / waypointTotal) * 100 : 0;

  const mapMarkers = (
    <>
      {droneCoord && (
        <Marker coordinate={droneCoord} title="Drone" pinColor="#F44336" />
      )}
      {waypoints.length > 1 && (
        <Polyline
          coordinates={waypoints.map(wp => ({
            latitude: wp.latitude,
            longitude: wp.longitude,
          }))}
          strokeColor="#00897B"
          strokeWidth={2}
        />
      )}
      {waypoints.map((wp, i) => (
        <Marker
          key={i}
          coordinate={{latitude: wp.latitude, longitude: wp.longitude}}
          title={`WP ${wp.sequence_index}`}
          pinColor={i < waypointCurrent ? '#4CAF50' : '#FF9800'}
          opacity={0.7}
        />
      ))}
    </>
  );

  // ── Tablet landscape: 3-column layout ────────────────────────────
  if (isTabletLandscape) {
    const telemetryRows = [
      {label: 'ALT', value: `${alt.toFixed(1)}`, unit: 'm', warn: false},
      {label: 'SPD', value: `${speed.toFixed(1)}`, unit: 'm/s', warn: false},
      {label: 'BAT', value: `${battery.toFixed(0)}`, unit: '%', warn: battery < 30},
      {label: 'GPS', value: `${satellites}`, unit: 'sat', warn: satellites < 6},
      {label: 'HDG', value: `${heading.toFixed(0)}`, unit: '°', warn: false},
    ];

    return (
      <View style={t.container}>
        {/* Top status bar */}
        <View style={t.statusBar}>
          <Text style={t.missionName} numberOfLines={1}>
            {currentMission?.name ?? 'Mission'}
          </Text>
          <Text style={t.timer}>T+ {formatElapsed(elapsed)}</Text>
          <View style={t.statusChips}>
            <View style={[t.chip, battery < 30 && t.chipWarn]}>
              <Text style={t.chipText}>BAT {battery.toFixed(0)}%</Text>
            </View>
            <View style={[t.chip, satellites < 6 && t.chipWarn]}>
              <Text style={t.chipText}>GPS {satellites}sat</Text>
            </View>
            <View style={t.chip}>
              <Text style={t.chipText}>{missionState}</Text>
            </View>
          </View>
        </View>

        {/* Body: left | center | right */}
        <View style={t.body}>
          {/* Left column — telemetry */}
          <View style={t.leftCol}>
            {telemetryRows.map(item => (
              <View key={item.label} style={t.telRow}>
                <Text style={t.telLabel}>{item.label}</Text>
                <Text style={[t.telValue, item.warn && {color: C.warn}]}>
                  {item.value}
                  <Text style={t.telUnit}>{item.unit}</Text>
                </Text>
              </View>
            ))}
          </View>

          {/* Center — map + video */}
          <View style={t.centerCol}>
            <MapView style={t.map} region={mapRegion}>
              {mapMarkers}
            </MapView>
            <LiveVideoPlayer style={t.video} />
          </View>

          {/* Right column — progress + actions */}
          <View style={t.rightCol}>
            <Text style={t.wpHeader}>Waypoints</Text>
            <Text style={t.wpCount}>
              {waypointCurrent} / {waypointTotal}
            </Text>
            <View style={t.progressTrack}>
              <View style={[t.progressFill, {width: `${progressPct}%` as any}]} />
            </View>
            <Text style={t.photosLabel}>{photosCount} photos</Text>

            <View style={t.actionButtons}>
              <TouchableOpacity style={[t.actionBtn, {backgroundColor: C.info}]} onPress={() => {}}>
                <Text style={t.actionBtnText}>PAUSE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[t.actionBtn, {backgroundColor: C.warn}]} onPress={handleRTH}>
                <Text style={t.actionBtnText}>RTH</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[t.actionBtn, {backgroundColor: C.healthy}]} onPress={handleRTH}>
                <Text style={t.actionBtnText}>LAND</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Abort bar */}
        <TouchableOpacity style={t.abortBar} onPress={handleAbort}>
          <Text style={t.abortBarText}>ABORT MISSION</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Phone / tablet portrait ──────────────────────────────────────
  const telemetryItems = [
    {label: 'ALT', value: `${alt.toFixed(1)}m`, warn: false},
    {label: 'SPD', value: `${speed.toFixed(1)}m/s`, warn: false},
    {label: 'BAT', value: `${battery.toFixed(0)}%`, warn: battery < 30},
    {label: 'GPS', value: `${satellites}sat`, warn: satellites < 6},
    {label: 'HDG', value: `${heading.toFixed(0)}°`, warn: false},
  ];

  const telemetryStrip = (
    <View style={[styles.telemetryStrip, isLandscape && styles.telemetryStripLandscape]}>
      {telemetryItems.map(item => (
        <View key={item.label} style={[styles.telemetryItem, isLandscape && styles.telemetryItemLandscape]}>
          <Text style={styles.telemetryLabel}>{item.label}</Text>
          <Text style={[styles.telemetryValue, item.warn && {color: '#F44336'}]}>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );

  const progressBar = (
    <View style={styles.progressContainer}>
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>WP {waypointCurrent}/{waypointTotal}</Text>
        <Text style={styles.progressText}>{photosCount} photos</Text>
        <Text style={styles.stateText}>{missionState}</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, {width: `${progressPct}%` as any}]} />
      </View>
    </View>
  );

  if (isLandscape) {
    return (
      <View style={styles.container}>
        <View style={styles.landscapeBody}>
          {telemetryStrip}
          <View style={styles.landscapeMapArea}>
            <LiveVideoPlayer style={styles.videoOverlay} />
            <MapView style={styles.map} region={mapRegion}>
              {mapMarkers}
            </MapView>
            {progressBar}
          </View>
          <TouchableOpacity style={styles.abortBtnLandscape} onPress={handleAbort}>
            <Text style={styles.abortText}>ABORT</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} region={mapRegion}>
        {mapMarkers}
      </MapView>
      {telemetryStrip}
      {progressBar}
      <LiveVideoPlayer style={styles.videoOverlayPortrait} />
      <TouchableOpacity style={styles.abortBtn} onPress={handleAbort}>
        <Text style={styles.abortText}>ABORT</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Tablet styles ────────────────────────────────────────────────
const t = StyleSheet.create({
  container: {flex: 1, backgroundColor: C.bg},
  statusBar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.panel,
    paddingHorizontal: 20,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.card,
  },
  missionName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: C.text1,
  },
  timer: {
    fontSize: 18,
    fontWeight: '700',
    color: C.brand,
    fontVariant: ['tabular-nums'],
  },
  statusChips: {flexDirection: 'row', gap: 8},
  chip: {
    backgroundColor: C.card,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipWarn: {backgroundColor: C.warn},
  chipText: {fontSize: 12, fontWeight: '600', color: C.text1},
  body: {flex: 1, flexDirection: 'row'},
  leftCol: {
    width: 280,
    backgroundColor: C.panel,
    borderRightWidth: 1,
    borderRightColor: C.card,
    paddingVertical: 8,
  },
  telRow: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: C.card,
  },
  telLabel: {fontSize: 11, fontWeight: '700', color: C.text3, letterSpacing: 1},
  telValue: {
    fontSize: 28,
    fontWeight: '700',
    color: C.text1,
    fontVariant: ['tabular-nums'],
    fontFamily: 'monospace',
  },
  telUnit: {fontSize: 14, color: C.text2},
  centerCol: {flex: 1},
  map: {flex: 6},
  video: {flex: 4},
  rightCol: {
    width: 240,
    backgroundColor: C.panel,
    borderLeftWidth: 1,
    borderLeftColor: C.card,
    padding: 20,
  },
  wpHeader: {fontSize: 11, fontWeight: '700', color: C.text3, letterSpacing: 1, marginBottom: 4},
  wpCount: {fontSize: 32, fontWeight: '700', color: C.text1, fontVariant: ['tabular-nums'], marginBottom: 12},
  progressTrack: {
    height: 6,
    backgroundColor: C.card,
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: 6,
    backgroundColor: C.healthy,
    borderRadius: 3,
  },
  photosLabel: {fontSize: 14, color: C.text2, marginBottom: 24},
  actionButtons: {gap: 12, marginTop: 'auto' as any},
  actionBtn: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  actionBtnText: {fontSize: 15, fontWeight: '800', color: C.bg},
  abortBar: {
    height: 56,
    backgroundColor: C.critical,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abortBarText: {fontSize: 16, fontWeight: '800', color: C.text1, letterSpacing: 2},
});

// ── Phone styles (unchanged) ────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#1A1A1A'},
  landscapeBody: {flex: 1, flexDirection: 'row'},
  landscapeMapArea: {flex: 1},
  map: {flex: 1},
  telemetryStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingVertical: 8,
    paddingHorizontal: 4,
    justifyContent: 'space-around',
  },
  telemetryStripLandscape: {
    flexDirection: 'column',
    width: 80,
    paddingVertical: 16,
    justifyContent: 'space-around',
  },
  telemetryItem: {alignItems: 'center', paddingHorizontal: 4},
  telemetryItemLandscape: {paddingVertical: 8},
  telemetryLabel: {color: '#888', fontSize: 10, fontWeight: '600'},
  telemetryValue: {color: '#0F0', fontSize: 16, fontWeight: '700', fontFamily: 'monospace'},
  progressContainer: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressText: {color: '#CCC', fontSize: 13},
  stateText: {color: '#00897B', fontSize: 13, fontWeight: '600'},
  progressBar: {height: 4, backgroundColor: '#333', borderRadius: 2},
  progressFill: {height: 4, backgroundColor: '#00897B', borderRadius: 2},
  abortBtn: {backgroundColor: '#D32F2F', paddingVertical: 14, alignItems: 'center'},
  abortBtnLandscape: {
    backgroundColor: '#D32F2F',
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  abortText: {color: '#FFF', fontSize: 18, fontWeight: '800'},
  videoOverlay: {position: 'absolute', top: 8, right: 8, zIndex: 10},
  videoOverlayPortrait: {position: 'absolute', top: 8, right: 8, zIndex: 10},
});
