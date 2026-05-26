import React, {useEffect, useRef, useCallback, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import MapView, {Marker, Polyline} from 'react-native-maps';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useDrone} from '../adapters/DroneAdapter';
import {useDroneStore} from '../store/droneStore';
import {useMissionStore} from '../store/missionStore';
import {useHudStore, deriveHudState, HudState} from '../store/hudStore';
import {MissionEngine} from '../engine/MissionEngine';
import {MissionState} from '../engine/MissionState';
import {updateTelemetryStore} from '../telemetry/TelemetryStore';
import {RootStackParamList} from '../App';
import LiveVideoPlayer from '../components/LiveVideoPlayer';
import {
  StatusPill,
  TelemTape,
  FlightCtrlBtn,
  StateBanner,
  KV,
} from '../components';
import {ModalRTH, ModalLand, ModalAbort, ModalEStop} from '../components/HudModals';
import {T, health, HEALTH_COLOR, spacing, radius, fontSize, fontFamily, hitTarget} from '../theme/tokens';
import {HudRegionBoundary, safeFmt} from '../components/ErrorBoundary';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function formatElapsed(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatEta(secs: number): string {
  if (secs <= 0) return '--:--';
  return formatElapsed(secs);
}

function statePillTone(state: HudState): 'green' | 'amber' | 'red' | 'blue' | 'cyan' {
  switch (state) {
    case 'FLYING': return 'green';
    case 'PAUSED': return 'amber';
    case 'RTH_ACTIVE': return 'blue';
    case 'LOW_BATTERY': return 'amber';
    case 'CRITICAL_BATTERY': return 'red';
    case 'LOST_LINK': return 'red';
    case 'GPS_DEGRADED': return 'amber';
    case 'GEOFENCE_HOVER': return 'amber';
    case 'OBSTACLE_BRAKE': return 'amber';
    case 'MISSION_COMPLETE': return 'green';
  }
}

function stateLabel(state: HudState): string {
  switch (state) {
    case 'FLYING': return 'FLYING';
    case 'PAUSED': return 'PAUSED';
    case 'RTH_ACTIVE': return 'RTH';
    case 'LOW_BATTERY': return 'LOW BATT';
    case 'CRITICAL_BATTERY': return 'AUTO-LAND';
    case 'LOST_LINK': return 'NO LINK';
    case 'GPS_DEGRADED': return 'ATTI MODE';
    case 'GEOFENCE_HOVER': return 'GEOFENCE';
    case 'OBSTACLE_BRAKE': return 'BRAKING';
    case 'MISSION_COMPLETE': return 'COMPLETE';
  }
}

interface BannerConfig {
  tone: 'green' | 'amber' | 'red' | 'blue' | 'cyan';
  icon: string;
  title: string;
  sub?: string;
  countdown?: number;
  actionLabel?: string;
}

function getBannerConfig(
  state: HudState,
  countdown: number | null,
  waypointCurrent: number,
  waypointTotal: number,
): BannerConfig | null {
  switch (state) {
    case 'FLYING':
    case 'MISSION_COMPLETE':
      return null;
    case 'PAUSED':
      return {
        tone: 'amber',
        icon: '⏸',
        title: `Mission paused at WP ${waypointCurrent}`,
        sub: 'Drone holds position · gimbal locked · video continues',
        actionLabel: 'RESUME',
      };
    case 'RTH_ACTIVE':
      return {
        tone: 'blue',
        icon: '⌂',
        title: 'Returning home — Smart RTH',
        sub: 'Climbing to RTH altitude, then navigating to home pad',
        actionLabel: 'CANCEL RTH',
      };
    case 'LOW_BATTERY':
      return {
        tone: 'amber',
        icon: '⚡',
        title: `Battery ${Math.round(0)}% — Auto-RTH in progress`,
        sub: 'Tap RTH NOW to start return immediately',
        countdown: countdown ?? 0,
        actionLabel: 'CANCEL · CONTINUE',
      };
    case 'CRITICAL_BATTERY':
      return {
        tone: 'red',
        icon: '⚡',
        title: 'Critical battery — Auto-LAND in progress',
        sub: 'Non-cancelable. E-STOP only if unsafe to land here.',
      };
    case 'LOST_LINK':
      return {
        tone: 'red',
        icon: '⚠',
        title: 'RC link lost — failsafe RTH imminent',
        sub: 'No video · No RC · Drone executing failsafe RTH',
      };
    case 'GPS_DEGRADED':
      return {
        tone: 'amber',
        icon: '◉',
        title: 'GPS degraded — Attitude mode engaged',
        sub: 'RTH disabled · Take manual stick control if needed',
        actionLabel: 'TAKE STICK',
      };
    case 'GEOFENCE_HOVER':
      return {
        tone: 'amber',
        icon: '⬡',
        title: 'Geofence boundary reached — hovering',
        sub: 'Drone held at fence perimeter',
        actionLabel: 'SKIP / REROUTE',
      };
    case 'OBSTACLE_BRAKE':
      return {
        tone: 'amber',
        icon: '⛔',
        title: 'Obstacle detected — drone braked',
        sub: 'Vision system stopped forward motion',
        actionLabel: 'RETRY',
      };
  }
}

export default function HudScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<any>();
  const missionId: string = route.params?.missionId;
  const adapter = useDrone();
  const {width, height} = useWindowDimensions();
  const isTabletLandscape = Math.min(width, height) >= 600 && width > height;

  // ── Telemetry reads ────────────────────────────────────────────────
  const lat = useDroneStore(s => s.lat);
  const lon = useDroneStore(s => s.lon);
  const alt = useDroneStore(s => s.alt);
  const speed = useDroneStore(s => s.speed);
  const vspeed = useDroneStore(s => s.vspeed);
  const battery = useDroneStore(s => s.battery);
  const battery_voltage = useDroneStore(s => s.battery_voltage);
  const battery_temp_c = useDroneStore(s => s.battery_temp_c);
  const satellites = useDroneStore(s => s.satellites);
  const heading = useDroneStore(s => s.heading);
  const signal = useDroneStore(s => s.signal);
  const rtk_status = useDroneStore(s => s.rtk_status);
  const gimbal_pitch = useDroneStore(s => s.gimbal_pitch);
  const telemetry_stale_since = useDroneStore(s => s.telemetry_stale_since);

  // ── Mission reads ──────────────────────────────────────────────────
  const currentMission = useMissionStore(s => s.currentMission);
  const missionState = useMissionStore(s => s.missionState);
  const waypointCurrent = useMissionStore(s => s.waypointCurrent);
  const waypointTotal = useMissionStore(s => s.waypointTotal);
  const photosCount = useMissionStore(s => s.photosCount);
  const waypoints = useMissionStore(s => s.waypoints);
  const updateState = useMissionStore(s => s.updateState);
  const setProgress = useMissionStore(s => s.setProgress);
  const incrementPhotos = useMissionStore(s => s.incrementPhotos);

  // ── HUD store ──────────────────────────────────────────────────────
  const hudState = useHudStore(s => s.hudState);
  const viewport = useHudStore(s => s.viewport);
  const countdownSec = useHudStore(s => s.countdownSec);
  const setHudState = useHudStore(s => s.setHudState);
  const setViewport = useHudStore(s => s.setViewport);
  const startLowBatteryGrace = useHudStore(s => s.startLowBatteryGrace);
  const cancelLowBatteryGrace = useHudStore(s => s.cancelLowBatteryGrace);
  const tickGrace = useHudStore(s => s.tickGrace);
  const resetHud = useHudStore(s => s.reset);

  // ── Engine refs ────────────────────────────────────────────────────
  const engineRef = useRef<MissionEngine | null>(null);
  const unsubTelemetryRef = useRef<(() => void) | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [activeModal, setActiveModal] = useState<'rth' | 'land' | 'abort' | 'estop' | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const graceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const telemetryTimestampRef = useRef<number>(Date.now());
  const gpsDegradedSinceRef = useRef<number | null>(null);
  const isRthActiveRef = useRef(false);

  // ── PRESERVED: MissionEngine wiring (lines 79-114 original) ───────
  const startMission = useCallback(async () => {
    const isResume = currentMission?.status === 'in_progress';
    const engine = new MissionEngine(adapter);
    engineRef.current = engine;

    unsubTelemetryRef.current = adapter.onTelemetry(data => {
      updateTelemetryStore(data);
      telemetryTimestampRef.current = Date.now();
      useDroneStore.getState().markTelemetryStaleSince(null);
    });

    engine.onStateChange(state => {
      updateState(state);
      if (state === MissionState.COMPLETED) {
        setHudState('MISSION_COMPLETE');
        setTimeout(() => navigation.navigate('MissionReview', {missionId}), 3000);
      }
    });

    engine.onProgress((current, total) => {
      setProgress(current, total);
      incrementPhotos();
    });

    await adapter.connect();
    useDroneStore.getState().setConnected(true);
    await engine.startMission(missionId, waypoints, isResume);
  }, [adapter, missionId, waypoints, currentMission, navigation, updateState, setProgress, incrementPhotos, setHudState]);

  useEffect(() => {
    resetHud();
    startMission();
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => {
      unsubTelemetryRef.current?.();
      engineRef.current?.abort();
      if (timerRef.current) clearInterval(timerRef.current);
      if (graceRef.current) clearInterval(graceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── State machine: telemetry-driven transitions ────────────────────
  useEffect(() => {
    const staleMsNow = telemetry_stale_since
      ? Date.now() - telemetry_stale_since
      : 0;

    const gpsOk = satellites >= 8 && rtk_status === 'FIX';
    if (!gpsOk && gpsDegradedSinceRef.current === null) {
      gpsDegradedSinceRef.current = Date.now();
    } else if (gpsOk) {
      gpsDegradedSinceRef.current = null;
    }
    const gpsDegradedMs = gpsDegradedSinceRef.current
      ? Date.now() - gpsDegradedSinceRef.current
      : 0;

    const missionComplete = missionState === MissionState.COMPLETED;
    const isPaused = hudState === 'PAUSED';

    const next = deriveHudState(hudState, {
      batteryPct: battery,
      satellites,
      rtkStatus: rtk_status,
      telemetryStaleMs: staleMsNow,
      missionComplete,
      isPaused,
      isRthActive: isRthActiveRef.current,
      geofenceHover: false,
      obstacleBrake: false,
      gpsDegradedDurationMs: gpsDegradedMs,
    });

    if (next !== hudState) {
      if (next === 'LOW_BATTERY' && hudState !== 'LOW_BATTERY') {
        startLowBatteryGrace();
        graceRef.current = setInterval(tickGrace, 1000);
      }
      if (hudState === 'LOW_BATTERY' && next !== 'LOW_BATTERY') {
        cancelLowBatteryGrace();
        if (graceRef.current) clearInterval(graceRef.current);
      }
      setHudState(next);
    }

    // Grace period expired → auto RTH
    if (hudState === 'LOW_BATTERY' && countdownSec === 0) {
      isRthActiveRef.current = true;
      setHudState('RTH_ACTIVE');
      if (graceRef.current) clearInterval(graceRef.current);
      engineRef.current?.abort();
    }
  }, [battery, satellites, rtk_status, telemetry_stale_since, missionState,
      hudState, countdownSec, setHudState, startLowBatteryGrace, cancelLowBatteryGrace, tickGrace]);

  // ── PRESERVED: Flight control handlers ────────────────────────────
  const handleAbort = useCallback(async () => {
    await engineRef.current?.abort();
    updateState(MissionState.ABORTED);
    navigation.navigate('Home');
  }, [updateState, navigation]);

  const handleRTH = useCallback(async () => {
    isRthActiveRef.current = true;
    setHudState('RTH_ACTIVE');
    await engineRef.current?.abort();
    navigation.navigate('Home');
  }, [setHudState, navigation]);

  const handleLand = useCallback(async () => {
    await engineRef.current?.abort();
    navigation.navigate('Home');
  }, [navigation]);

  const handleEstop = useCallback(async () => {
    await engineRef.current?.abort();
    updateState(MissionState.ABORTED);
    navigation.navigate('Home');
  }, [updateState, navigation]);

  const handlePause = useCallback(async () => {
    await engineRef.current?.pause();
    setHudState('PAUSED');
  }, [setHudState]);

  const handleResume = useCallback(async () => {
    await engineRef.current?.resume(waypoints);
    setHudState('FLYING');
  }, [waypoints, setHudState]);

  // ── Derived display values ─────────────────────────────────────────
  const droneCoord = lat !== 0 ? {latitude: lat, longitude: lon} : null;
  const mapRegion = droneCoord
    ? {...droneCoord, latitudeDelta: 0.003, longitudeDelta: 0.003}
    : {latitude: 39.9612, longitude: -82.9988, latitudeDelta: 0.01, longitudeDelta: 0.01};

  const progressPct = waypointTotal > 0 ? (waypointCurrent / waypointTotal) * 100 : 0;
  const battHealth = health.battery(battery);
  const signalHealth = health.signal(signal);
  const satsHealth = health.sats(satellites);
  const rtkHealth = health.rtk(rtk_status);
  const altHealth = health.altitude(alt);
  const vspeedHealth = health.vspeed(vspeed);

  const isPaused = hudState === 'PAUSED';
  const isComplete = hudState === 'MISSION_COMPLETE';
  const isLinkLost = hudState === 'LOST_LINK';
  const isCritBatt = hudState === 'CRITICAL_BATTERY';

  const mapMarkers = (
    <>
      {droneCoord && (
        <Marker coordinate={droneCoord} title="Drone" pinColor={T.cyan} />
      )}
      {waypoints.length > 1 && (
        <Polyline
          coordinates={waypoints.map(wp => ({
            latitude: wp.latitude,
            longitude: wp.longitude,
          }))}
          strokeColor={T.cyanDim}
          strokeWidth={2}
        />
      )}
      {waypoints.map((wp, i) => (
        <Marker
          key={i}
          coordinate={{latitude: wp.latitude, longitude: wp.longitude}}
          title={`WP ${wp.sequence_index}`}
          pinColor={i < waypointCurrent ? T.green : T.amber}
          opacity={0.8}
        />
      ))}
    </>
  );

  const bannerConfig = getBannerConfig(hudState, countdownSec, waypointCurrent, waypointTotal);

  const staleSec = telemetry_stale_since
    ? Math.round((Date.now() - telemetry_stale_since) / 1000)
    : 0;
  const showStaleBanner = staleSec >= 3 && hudState !== 'LOST_LINK';

  // ── Fallback: phone layout (minimal) ──────────────────────────────
  if (!isTabletLandscape) {
    return (
      <View style={s.phoneFallback}>
        {showStaleBanner && (
          <View style={s.staleBanner}>
            <Text style={s.staleBannerText}>⚠  TELEMETRY DELAYED · {staleSec}s</Text>
          </View>
        )}
        <MapView style={s.phoneMap} region={mapRegion} initialRegion={mapRegion}>
          {mapMarkers}
        </MapView>
        <View style={s.phoneTelemetry}>
          <Text style={s.phoneTel}>ALT {safeFmt(alt, 1)}m</Text>
          <Text style={s.phoneTel}>SPD {safeFmt(speed, 1)}m/s</Text>
          <Text style={[s.phoneTel, battHealth !== 'ok' && {color: HEALTH_COLOR[battHealth]}]}>
            BAT {safeFmt(battery, 0)}%
          </Text>
          <Text style={s.phoneTel}>GPS {satellites}sat</Text>
        </View>
        <Text style={s.phoneTimer}>T+ {formatElapsed(elapsed)}</Text>
        <TouchableOpacity style={s.phoneAbort} onPress={handleAbort}>
          <Text style={s.phoneAbortText}>ABORT</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Tablet landscape: full 3-column HUD ───────────────────────────
  return (
    <View style={s.root}>

      {/* ── TOP STRIP ──────────────────────────────────────────────── */}
      <View style={s.topStrip}>
        <View style={s.topLeft}>
          <Text style={s.droneLabel}>M350-A</Text>
          <Text style={s.missionName} numberOfLines={1}>
            {currentMission?.name ?? 'Mission'}
          </Text>
        </View>

        <StatusPill
          tone={statePillTone(hudState)}
          icon={<Text>{hudState === 'FLYING' ? '▶' : hudState === 'PAUSED' ? '⏸' : '!'}</Text>}
          label={stateLabel(hudState)}
          size="md"
        />

        <View style={s.topTimers}>
          <Text style={s.timerLabel}>T+</Text>
          <Text style={s.timerValue}>{formatElapsed(elapsed)}</Text>
        </View>

        <View style={s.topPills}>
          <StatusPill
            tone={battHealth === 'ok' ? 'green' : battHealth === 'warn' ? 'amber' : 'red'}
            icon={<Text>⚡</Text>}
            label="BAT"
            value={`${safeFmt(battery, 0)}%`}
            size="sm"
          />
          <StatusPill
            tone={satsHealth === 'ok' ? 'green' : satsHealth === 'warn' ? 'amber' : 'red'}
            icon={<Text>◉</Text>}
            label="GPS"
            value={`${satellites}sat`}
            size="sm"
          />
          <StatusPill
            tone={rtkHealth === 'ok' ? 'green' : rtkHealth === 'warn' ? 'amber' : 'red'}
            icon={<Text>⊕</Text>}
            label="RTK"
            value={rtk_status}
            size="sm"
          />
          <StatusPill
            tone={signalHealth === 'ok' ? 'cyan' : signalHealth === 'warn' ? 'amber' : 'red'}
            icon={<Text>◈</Text>}
            label="LINK"
            value={`${safeFmt(signal, 0)}dBm`}
            size="sm"
          />
        </View>

        <Text style={s.operatorLabel}>GOV ISLAND OPS</Text>
      </View>

      {showStaleBanner && (
        <View style={s.staleBanner}>
          <Text style={s.staleBannerText}>⚠  TELEMETRY DELAYED · {staleSec}s</Text>
        </View>
      )}

      {/* ── BODY: LEFT | CENTER | RIGHT ────────────────────────────── */}
      <View style={s.body}>

        {/* ── LEFT TELEM RAIL ──────────────────────────────────────── */}
        <View style={s.leftRail}>
          <HudRegionBoundary tag="TELEM">
          <TelemTape
            icon={<Text style={{color: HEALTH_COLOR[altHealth]}}>↕</Text>}
            label="ALT AGL"
            value={safeFmt(alt, 1)}
            unit="m"
            health={altHealth}
            big
          />
          <TelemTape
            icon={<Text style={{color: T.t2}}>→</Text>}
            label="GND SPD"
            value={safeFmt(speed, 1)}
            unit="m/s"
            big
          />
          <TelemTape
            icon={<Text style={{color: HEALTH_COLOR[vspeedHealth]}}>↕</Text>}
            label="V SPEED"
            value={!isFinite(vspeed) ? '—' : (vspeed >= 0 ? `+${vspeed.toFixed(1)}` : vspeed.toFixed(1))}
            unit="m/s"
            health={vspeedHealth}
          />
          <TelemTape
            icon={<Text style={{color: T.t2}}>⊙</Text>}
            label="HEADING"
            value={safeFmt(heading, 0)}
            unit="°"
          />
          <TelemTape
            icon={<Text style={{color: T.t2}}>◇</Text>}
            label="GIMBAL"
            value={safeFmt(gimbal_pitch, 0)}
            unit="°"
            subLabel="PITCH"
          />

          {/* Battery kill-clock block */}
          <View style={s.battBlock}>
            <View style={s.battHeader}>
              <Text style={s.battPct}>{safeFmt(battery, 0)}</Text>
              <Text style={s.battPctUnit}>%</Text>
            </View>
            <Text style={s.battVolt}>{safeFmt(battery_voltage, 1)}V · {safeFmt(battery_temp_c, 0)}°C</Text>
            <View style={s.battTrack}>
              <View style={[s.battFill, {
                width: `${battery}%` as any,
                backgroundColor: HEALTH_COLOR[battHealth],
              }]} />
              {/* RTH tick at 25% */}
              <View style={[s.battTick, {left: '25%'}]} />
              {/* LAND tick at 15% */}
              <View style={[s.battTick, {left: '15%'}]} />
            </View>
            <View style={s.battThresholds}>
              <Text style={[s.battThreshLabel, {left: '15%'}]}>LAND</Text>
              <Text style={[s.battThreshLabel, {left: '25%'}]}>RTH</Text>
            </View>
          </View>

          {/* GPS + RC link footer */}
          <View style={s.railFooter}>
            <KV label="GPS" value={`${satellites} sat`} mono inline />
            <KV label="RTK" value={rtk_status} mono inline tone={rtkHealth === 'ok' ? 'green' : rtkHealth === 'warn' ? 'amber' : 'red'} noDivider />
            <KV label="RC LINK" value={`${safeFmt(signal, 0)} dBm`} mono inline tone={signalHealth === 'ok' ? 'cyan' : signalHealth === 'warn' ? 'amber' : 'red'} noDivider />
          </View>
          </HudRegionBoundary>
        </View>

        {/* ── CENTER AREA ──────────────────────────────────────────── */}
        <View style={s.center}>
          <HudRegionBoundary tag="MAP">
          {/* State banner */}
          {bannerConfig && (
            <StateBanner
              tone={bannerConfig.tone}
              icon={<Text style={{fontSize: 16}}>{bannerConfig.icon}</Text>}
              title={bannerConfig.title}
              sub={bannerConfig.sub}
              countdown={bannerConfig.countdown}
              action={bannerConfig.actionLabel ? {
                label: bannerConfig.actionLabel,
                onPress: isPaused ? handleResume : handleRTH,
              } : undefined}
            />
          )}

          {/* Main viewport */}
          {viewport === 'video_primary' ? (
            <>
              <LiveVideoPlayer style={s.videoMain} />
              {/* Map PiP */}
              <View style={s.mapPip}>
                <MapView style={StyleSheet.absoluteFill} initialRegion={mapRegion}>
                  {mapMarkers}
                </MapView>
              </View>
            </>
          ) : (
            <>
              <MapView style={s.mapMain} initialRegion={mapRegion}>
                {mapMarkers}
              </MapView>
              {/* Video PiP */}
              <View style={s.videoPip}>
                <LiveVideoPlayer style={StyleSheet.absoluteFill} />
              </View>
            </>
          )}

          {/* Viewport swap button */}
          <TouchableOpacity
            style={s.swapBtn}
            onPress={() => setViewport(viewport === 'video_primary' ? 'map_primary' : 'video_primary')}
            accessibilityLabel="Swap video and map">
            <Text style={s.swapBtnText}>
              {viewport === 'video_primary' ? '◉ MAP' : '▶ VIDEO'}
            </Text>
          </TouchableOpacity>
          </HudRegionBoundary>
        </View>

        {/* ── RIGHT MISSION PANEL ───────────────────────────────────── */}
        <View style={s.rightPanel}>

          <HudRegionBoundary tag="MISSION_INFO">
          {/* Mission progress card */}
          <View style={s.progressCard}>
            <View style={s.progressCardHeader}>
              <Text style={s.progressFrac}>
                {waypointCurrent} <Text style={s.progressFracOf}>/ {waypointTotal}</Text>
              </Text>
              <Text style={s.progressPct}>{safeFmt(progressPct, 0)}%</Text>
            </View>
            <Text style={s.progressSub}>waypoints · {photosCount} photos</Text>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, {width: `${progressPct}%` as any}]} />
            </View>
            <View style={s.progressTimers}>
              <Text style={s.progressTimerLabel}>ELAPSED</Text>
              <Text style={s.progressTimerValue}>{formatElapsed(elapsed)}</Text>
              <Text style={s.progressTimerLabel}>ETA</Text>
              <Text style={s.progressTimerValue}>{formatEta(0)}</Text>
            </View>
          </View>

          {/* Routine chip */}
          <View style={s.routineChip}>
            <Text style={s.routineChipText}>
              {currentMission?.routine_type?.toUpperCase() ?? 'ORBIT'}
            </Text>
          </View>

          {/* Waypoint list — 5 visible */}
          <ScrollView style={s.wpList} showsVerticalScrollIndicator={false}>
            {waypoints.slice(
              Math.max(0, waypointCurrent - 1),
              Math.max(0, waypointCurrent - 1) + 5,
            ).map((wp, offset) => {
              const globalIdx = Math.max(0, waypointCurrent - 1) + offset;
              const isCurrent = globalIdx === waypointCurrent;
              const isDone = globalIdx < waypointCurrent;
              return (
                <View
                  key={wp.sequence_index}
                  style={[s.wpRow, isCurrent && s.wpRowCurrent, isDone && s.wpRowDone]}>
                  <Text style={[s.wpIndex, isCurrent && {color: T.cyan}]}>
                    {String(wp.sequence_index).padStart(2, '0')}
                  </Text>
                  <Text style={[s.wpCoord, isDone && {color: T.t3}]}>
                    {wp.latitude.toFixed(5)}, {wp.longitude.toFixed(5)}
                  </Text>
                  <Text style={[s.wpAlt, isDone && {color: T.t3}]}>
                    {wp.altitude_m}m
                  </Text>
                </View>
              );
            })}
          </ScrollView>
          </HudRegionBoundary>

          {/* Pause / Skip row */}
          <View style={s.pauseRow}>
            <TouchableOpacity
              style={[s.pauseBtn, isPaused && {backgroundColor: T.cyan}]}
              onPress={isPaused ? handleResume : handlePause}
              disabled={isComplete || isLinkLost || isCritBatt}
              accessibilityLabel={isPaused ? 'Resume mission' : 'Pause mission'}>
              <Text style={[s.pauseBtnText, isPaused && {color: T.bg}]}>
                {isPaused ? '▶ RESUME' : '⏸ PAUSE'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.skipBtn} disabled>
              <Text style={s.skipBtnText}>⏮</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.skipBtn} disabled>
              <Text style={s.skipBtnText}>⏭</Text>
            </TouchableOpacity>
          </View>

          {/* Flight control cluster — 2×2 */}
          <View style={s.ctrlGrid}>
            <FlightCtrlBtn
              icon={<Text>⌂</Text>}
              label="RTH"
              subLabel="CONFIRM"
              severity="blue"
              onPress={() => setActiveModal('rth')}
              disabled={isLinkLost || isCritBatt || hudState === 'GPS_DEGRADED'}
              style={s.ctrlBtn}
            />
            <FlightCtrlBtn
              icon={<Text>▼</Text>}
              label="LAND"
              subLabel="CONFIRM"
              severity="amber"
              onPress={() => setActiveModal('land')}
              disabled={isLinkLost || isCritBatt}
              style={s.ctrlBtn}
            />
            <FlightCtrlBtn
              icon={<Text>✕</Text>}
              label="ABORT"
              subLabel="CONFIRM"
              severity="red"
              requireHold={false}
              onPress={() => setActiveModal('abort')}
              disabled={isLinkLost}
              style={s.ctrlBtn}
            />
            <FlightCtrlBtn
              icon={<Text>⏻</Text>}
              label="E-STOP"
              subLabel="CONFIRM"
              severity="red"
              requireHold={false}
              onPress={() => setActiveModal('estop')}
              active={isLinkLost || isCritBatt}
              style={s.ctrlBtn}
            />
          </View>
        </View>
      </View>

      {/* ── HUD confirmation modals ──────────────────────────────── */}
      <ModalRTH
        visible={activeModal === 'rth'}
        onConfirm={() => { setActiveModal(null); handleRTH(); }}
        onCancel={() => setActiveModal(null)}
        alt={alt}
        battery={battery}
        batteryVoltage={battery_voltage}
        signal={signal}
      />
      <ModalLand
        visible={activeModal === 'land'}
        onConfirm={() => { setActiveModal(null); handleLand(); }}
        onCancel={() => setActiveModal(null)}
        alt={alt}
        vspeed={vspeed}
        satellites={satellites}
        battery={battery}
      />
      <ModalAbort
        visible={activeModal === 'abort'}
        onConfirm={() => { setActiveModal(null); handleAbort(); }}
        onCancel={() => setActiveModal(null)}
        alt={alt}
        battery={battery}
        waypointCurrent={waypointCurrent}
        waypointTotal={waypointTotal}
        photosCount={photosCount}
      />
      <ModalEStop
        visible={activeModal === 'estop'}
        onConfirm={() => { setActiveModal(null); handleEstop(); }}
        onCancel={() => setActiveModal(null)}
        alt={alt}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: T.bg},

  // Top strip
  topStrip: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.panelHi,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: T.hairline,
  },
  topLeft: {flex: 1},
  droneLabel: {fontSize: 10, color: T.t3, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: fontFamily.ui},
  missionName: {fontSize: 16, fontWeight: '700', color: T.t1, fontFamily: fontFamily.ui},
  topTimers: {flexDirection: 'row', alignItems: 'baseline', gap: 4},
  timerLabel: {fontSize: 11, color: T.t3, fontWeight: '700', letterSpacing: 1, fontFamily: fontFamily.ui},
  timerValue: {fontSize: 22, fontWeight: '700', color: T.cyan, fontFamily: fontFamily.mono, fontVariant: ['tabular-nums']},
  topPills: {flexDirection: 'row', gap: spacing.sm},
  operatorLabel: {fontSize: 11, color: T.t3, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: fontFamily.ui},

  // Body
  body: {flex: 1, flexDirection: 'row'},

  // Left rail
  leftRail: {
    width: 280,
    backgroundColor: T.panel,
    borderRightWidth: 1,
    borderRightColor: T.hairline,
  },

  // Battery kill-clock
  battBlock: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: T.hairline,
    borderBottomWidth: 1,
    borderBottomColor: T.hairline,
  },
  battHeader: {flexDirection: 'row', alignItems: 'baseline'},
  battPct: {fontSize: fontSize.sectionHero, fontWeight: '700', color: T.t1, fontFamily: fontFamily.mono, fontVariant: ['tabular-nums']},
  battPctUnit: {fontSize: 18, color: T.t2, fontFamily: fontFamily.ui, marginLeft: 4},
  battVolt: {fontSize: 11, color: T.t3, fontFamily: fontFamily.mono, marginBottom: spacing.sm},
  battTrack: {height: 6, backgroundColor: T.card, borderRadius: radius.chip, overflow: 'hidden', position: 'relative'},
  battFill: {height: 6, borderRadius: radius.chip},
  battTick: {position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: T.bg},
  battThresholds: {flexDirection: 'row', height: 16, position: 'relative'},
  battThreshLabel: {position: 'absolute', fontSize: 9, color: T.t3, fontFamily: fontFamily.mono, letterSpacing: 0.5},

  // Rail footer
  railFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },

  // Center
  center: {flex: 1, backgroundColor: T.bg, position: 'relative', overflow: 'hidden'},
  videoMain: {flex: 1},
  mapMain: {flex: 1},
  mapPip: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    width: 260,
    height: 190,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.hairline,
  },
  videoPip: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 280,
    height: 170,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.hairline,
  },
  swapBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: T.panel,
    borderWidth: 1,
    borderColor: T.hairline,
    borderRadius: radius.btn,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: hitTarget.btn,
    justifyContent: 'center',
  },
  swapBtnText: {fontSize: 12, fontWeight: '700', color: T.cyan, letterSpacing: 1, fontFamily: fontFamily.ui},

  // Right panel
  rightPanel: {
    width: 300,
    backgroundColor: T.panel,
    borderLeftWidth: 1,
    borderLeftColor: T.hairline,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },

  // Progress card
  progressCard: {
    backgroundColor: T.card,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  progressCardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline'},
  progressFrac: {fontSize: 28, fontWeight: '700', color: T.t1, fontFamily: fontFamily.mono, fontVariant: ['tabular-nums']},
  progressFracOf: {fontSize: 16, color: T.t2},
  progressPct: {fontSize: 20, fontWeight: '700', color: T.cyan, fontFamily: fontFamily.mono, fontVariant: ['tabular-nums']},
  progressSub: {fontSize: 11, color: T.t3, fontFamily: fontFamily.ui},
  progressTrack: {height: 4, backgroundColor: T.bg, borderRadius: 2},
  progressFill: {height: 4, backgroundColor: T.cyan, borderRadius: 2},
  progressTimers: {flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap'},
  progressTimerLabel: {fontSize: 9, color: T.t3, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: fontFamily.ui},
  progressTimerValue: {fontSize: 14, color: T.t1, fontFamily: fontFamily.mono, fontVariant: ['tabular-nums']},

  // Routine chip
  routineChip: {
    backgroundColor: T.card,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  routineChipText: {fontSize: 11, fontWeight: '700', color: T.cyan, letterSpacing: 1, fontFamily: fontFamily.ui},

  // WP list
  wpList: {flex: 1, maxHeight: 180},
  wpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: T.hairline2,
  },
  wpRowCurrent: {
    borderLeftWidth: 3,
    borderLeftColor: T.cyan,
    paddingLeft: spacing.sm,
  },
  wpRowDone: {opacity: 0.4},
  wpIndex: {width: 24, fontSize: 11, fontWeight: '700', color: T.t3, fontFamily: fontFamily.mono},
  wpCoord: {flex: 1, fontSize: 10, color: T.t2, fontFamily: fontFamily.mono},
  wpAlt: {fontSize: 10, color: T.t2, fontFamily: fontFamily.mono},

  // Pause row
  pauseRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  pauseBtn: {
    flex: 1,
    minHeight: hitTarget.btn,
    backgroundColor: T.card,
    borderRadius: radius.btn,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.hairline,
  },
  pauseBtnText: {fontSize: 13, fontWeight: '700', color: T.t1, letterSpacing: 0.8, fontFamily: fontFamily.ui},
  skipBtn: {
    width: hitTarget.btn,
    height: hitTarget.btn,
    backgroundColor: T.card,
    borderRadius: radius.btn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {fontSize: 18, color: T.t3},

  // Control cluster
  ctrlGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ctrlBtn: {width: '47%'},

  // Phone fallback
  phoneFallback: {flex: 1, backgroundColor: T.bg},
  phoneMap: {flex: 1},
  phoneTelemetry: {
    flexDirection: 'row',
    backgroundColor: T.panel,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  phoneTel: {fontSize: 13, color: T.t1, fontFamily: fontFamily.mono},
  phoneTimer: {fontSize: 20, fontWeight: '700', color: T.cyan, textAlign: 'center', paddingVertical: spacing.sm, fontFamily: fontFamily.mono},
  phoneAbort: {backgroundColor: T.red, paddingVertical: spacing.lg, alignItems: 'center'},
  phoneAbortText: {fontSize: 16, fontWeight: '800', color: T.t1, letterSpacing: 2, fontFamily: fontFamily.ui},
  staleBanner: {
    backgroundColor: `${T.amber}22`,
    borderBottomWidth: 1,
    borderBottomColor: `${T.amber}55`,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  staleBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: T.amber,
    fontFamily: fontFamily.mono,
    letterSpacing: 0.1,
  },
});

