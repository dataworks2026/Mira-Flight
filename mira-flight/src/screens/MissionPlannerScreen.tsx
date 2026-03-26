import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import MapView, {Marker, Polyline} from 'react-native-maps';
import {miraClient} from '../api/miraClient';
import {generateWaypoints} from '../routines/WaypointGenerator';
import {useMissionStore} from '../store/missionStore';
import {RoutineType} from '../types/shared';
import {RootStackParamList} from '../App';

const TEAL = '#00897B';
const ROUTINES: RoutineType[] = [
  'sweep',
  'orbit',
  'grid',
  'traverse',
  'crawl',
  'scout',
];

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function MissionPlannerScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<any>();
  const setWaypoints = useMissionStore(s => s.setWaypoints);
  const setMission = useMissionStore(s => s.setMission);

  const [name, setName] = useState('');
  const [assetName, setAssetName] = useState('');
  const [routineType, setRoutineType] = useState<RoutineType>('orbit');
  const [altitude, setAltitude] = useState('30');
  const [speed, setSpeed] = useState('3');
  const [centerLat, setCenterLat] = useState('39.9612');
  const [centerLon, setCenterLon] = useState('-82.9988');
  const [radius, setRadius] = useState('50');
  const [numPhotos, setNumPhotos] = useState('12');
  const [gimbalPitch, setGimbalPitch] = useState('-30');

  const waypoints = useMemo(() => {
    try {
      const lat = parseFloat(centerLat);
      const lon = parseFloat(centerLon);
      const alt = parseFloat(altitude);
      const spd = parseFloat(speed);
      const rad = parseFloat(radius);
      const photos = parseInt(numPhotos, 10);
      const pitch = parseFloat(gimbalPitch);

      if (routineType === 'orbit') {
        return generateWaypoints('orbit', {
          center_lat: lat,
          center_lon: lon,
          radius_m: rad,
          altitude_m: alt,
          speed_ms: spd,
          num_photos: photos,
          gimbal_pitch: pitch,
          clockwise: true,
        });
      }
      if (routineType === 'sweep') {
        return generateWaypoints('sweep', {
          start_lat: lat,
          start_lon: lon,
          end_lat: lat + 0.001,
          end_lon: lon + 0.001,
          altitude_m: alt,
          speed_ms: spd,
          photo_interval_m: rad,
          gimbal_pitch: pitch,
        });
      }
      if (routineType === 'scout') {
        return generateWaypoints('scout', {
          center_lat: lat,
          center_lon: lon,
          radius_m: rad,
          altitude_m: alt,
          speed_ms: spd,
          gimbal_pitch: pitch,
        });
      }
      if (routineType === 'grid') {
        const offset = 0.0005;
        return generateWaypoints('grid', {
          boundary: [
            {lat: lat - offset, lon: lon - offset, alt: 0},
            {lat: lat + offset, lon: lon - offset, alt: 0},
            {lat: lat + offset, lon: lon + offset, alt: 0},
            {lat: lat - offset, lon: lon + offset, alt: 0},
          ],
          altitude_m: alt,
          speed_ms: spd,
          overlap_pct: 70,
          sidelap_pct: 60,
          gimbal_pitch: -90,
          camera_fov_deg: 84,
        });
      }
      if (routineType === 'crawl') {
        return generateWaypoints('crawl', {
          target_lat: lat,
          target_lon: lon,
          standoff_m: rad,
          altitude_m: alt,
          scan_height_m: alt * 0.5,
          speed_ms: spd,
          gimbal_pitch: pitch,
          num_passes: photos,
        });
      }
      if (routineType === 'traverse') {
        return generateWaypoints('traverse', {
          waypoints: [
            {lat, lon, alt: 0},
            {lat: lat + 0.001, lon: lon + 0.001, alt: 0},
          ],
          altitude_m: alt,
          speed_ms: spd,
          photo_interval_m: rad,
          gimbal_pitch: pitch,
        });
      }
      return [];
    } catch {
      return [];
    }
  }, [routineType, centerLat, centerLon, altitude, speed, radius, numPhotos, gimbalPitch]);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Mission name is required');
      return;
    }

    try {
      const mission = await miraClient.createMission({
        name,
        asset_name: assetName,
        routine_type: routineType,
        waypoints,
      });
      setMission(mission);
      setWaypoints(waypoints);
      await miraClient.updateWaypoints(mission.id, waypoints);
      navigation.navigate('Preflight', {missionId: mission.id});
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create mission');
    }
  };

  const center = {
    latitude: parseFloat(centerLat) || 39.9612,
    longitude: parseFloat(centerLon) || -82.9988,
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Plan Mission</Text>

      <TextInput
        style={styles.input}
        placeholder="Mission Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Asset Name"
        value={assetName}
        onChangeText={setAssetName}
      />

      <Text style={styles.label}>Flight Routine</Text>
      <View style={styles.routineRow}>
        {ROUTINES.map(r => (
          <TouchableOpacity
            key={r}
            style={[
              styles.routineBtn,
              routineType === r && styles.routineBtnActive,
            ]}
            onPress={() => setRoutineType(r)}>
            <Text
              style={[
                styles.routineText,
                routineType === r && styles.routineTextActive,
              ]}>
              {r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Latitude</Text>
          <TextInput
            style={styles.input}
            value={centerLat}
            onChangeText={setCenterLat}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Longitude</Text>
          <TextInput
            style={styles.input}
            value={centerLon}
            onChangeText={setCenterLon}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.thirdInput}>
          <Text style={styles.label}>Alt (m)</Text>
          <TextInput
            style={styles.input}
            value={altitude}
            onChangeText={setAltitude}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.thirdInput}>
          <Text style={styles.label}>Speed (m/s)</Text>
          <TextInput
            style={styles.input}
            value={speed}
            onChangeText={setSpeed}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.thirdInput}>
          <Text style={styles.label}>Radius (m)</Text>
          <TextInput
            style={styles.input}
            value={radius}
            onChangeText={setRadius}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Photos</Text>
          <TextInput
            style={styles.input}
            value={numPhotos}
            onChangeText={setNumPhotos}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Gimbal Pitch</Text>
          <TextInput
            style={styles.input}
            value={gimbalPitch}
            onChangeText={setGimbalPitch}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            ...center,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}>
          {waypoints.map((wp, i) => (
            <Marker
              key={i}
              coordinate={{latitude: wp.latitude, longitude: wp.longitude}}
              title={`WP ${wp.index}`}
              pinColor={TEAL}
            />
          ))}
          {waypoints.length > 1 && (
            <Polyline
              coordinates={waypoints.map(wp => ({
                latitude: wp.latitude,
                longitude: wp.longitude,
              }))}
              strokeColor={TEAL}
              strokeWidth={2}
            />
          )}
        </MapView>
      </View>

      <Text style={styles.waypointCount}>
        {waypoints.length} waypoints generated
      </Text>

      <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
        <Text style={styles.createBtnText}>Create Mission</Text>
      </TouchableOpacity>

      <View style={{height: 40}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFF', padding: 16},
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  label: {fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 4},
  routineRow: {flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12},
  routineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD',
    marginRight: 8,
    marginBottom: 8,
  },
  routineBtnActive: {backgroundColor: TEAL, borderColor: TEAL},
  routineText: {fontSize: 13, color: '#666'},
  routineTextActive: {color: '#FFF'},
  row: {flexDirection: 'row', gap: 8},
  halfInput: {flex: 1},
  thirdInput: {flex: 1},
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  map: {flex: 1},
  waypointCount: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginBottom: 16,
  },
  createBtn: {
    backgroundColor: TEAL,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  createBtnText: {color: '#FFF', fontSize: 16, fontWeight: '600'},
});
