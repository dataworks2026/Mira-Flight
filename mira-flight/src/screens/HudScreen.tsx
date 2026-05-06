import React, {useEffect, useRef, useCallback} from 'react';
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

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function HudScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<any>();
  const missionId = route.params?.missionId;
  const adapter = useDrone();
  const {width, height} = useWindowDimensions();
  const isLandscape = width > height;

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
    return () => {
      unsubTelemetryRef.current?.();
      engineRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAbort = async () => {
    await engineRef.current?.abort();
    updateState(MissionState.ABORTED);
    navigation.navigate('Home');
  };

  const droneCoord = lat !== 0 ? {latitude: lat, longitude: lon} : null;
  const mapRegion = droneCoord
    ? {...droneCoord, latitudeDelta: 0.003, longitudeDelta: 0.003}
    : {latitude: 39.9612, longitude: -82.9988, latitudeDelta: 0.01, longitudeDelta: 0.01};

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
          <Text
            style={[
              styles.telemetryValue,
              item.warn && {color: '#F44336'},
            ]}>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );

  const progressBar = (
    <View style={styles.progressContainer}>
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          WP {waypointCurrent}/{waypointTotal}
        </Text>
        <Text style={styles.progressText}>📷 {photosCount}</Text>
        <Text style={styles.stateText}>{missionState}</Text>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${
                waypointTotal > 0
                  ? (waypointCurrent / waypointTotal) * 100
                  : 0
              }%`,
            },
          ]}
        />
      </View>
    </View>
  );

  if (isLandscape) {
    return (
      <View style={styles.container}>
        <View style={styles.landscapeBody}>
          {telemetryStrip}
          <View style={styles.landscapeMapArea}>
            <MapView
              style={styles.map}
              region={mapRegion}>
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
      <MapView
        style={styles.map}
        region={mapRegion}>
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
      </MapView>

      {telemetryStrip}
      {progressBar}

      <TouchableOpacity style={styles.abortBtn} onPress={handleAbort}>
        <Text style={styles.abortText}>ABORT</Text>
      </TouchableOpacity>
    </View>
  );
}

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
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    backgroundColor: '#00897B',
    borderRadius: 2,
  },
  abortBtn: {
    backgroundColor: '#D32F2F',
    paddingVertical: 14,
    alignItems: 'center',
  },
  abortBtnLandscape: {
    backgroundColor: '#D32F2F',
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  abortText: {color: '#FFF', fontSize: 18, fontWeight: '800'},
});
