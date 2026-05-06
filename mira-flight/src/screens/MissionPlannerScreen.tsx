import React, {useState, useMemo, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import MapView, {Marker, Polygon, Polyline} from 'react-native-maps';
import {miraClient} from '../api/miraClient';
import {generateWaypoints} from '../routines/WaypointGenerator';
import {useMissionStore} from '../store/missionStore';
import {RoutineType, Asset} from '../types/shared';
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
  const editMissionId = route.params?.missionId;
  const {width, height} = useWindowDimensions();
  const isLandscape = width > height;

  const setStoreWaypoints = useMissionStore(s => s.setWaypoints);
  const setMission = useMissionStore(s => s.setMission);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [name, setName] = useState('');
  const [routineType, setRoutineType] = useState<RoutineType>('orbit');
  const [altitude, setAltitude] = useState('30');
  const [speed, setSpeed] = useState('3');
  const [radius, setRadius] = useState('50');
  const [numPhotos, setNumPhotos] = useState('12');
  const [gimbalPitch, setGimbalPitch] = useState('-30');
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(!!editMissionId);
  const [isEdit, setIsEdit] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [boundaryPoints, setBoundaryPoints] = useState<
    {latitude: number; longitude: number}[]
  >([]);

  useEffect(() => {
    miraClient.getAssets().then(setAssets).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editMissionId) {
      return;
    }
    setLoadingExisting(true);
    miraClient
      .getMission(editMissionId)
      .then(mission => {
        setName(mission.name);
        setRoutineType((mission.routine_type as RoutineType) || 'orbit');
        setIsEdit(true);
        setMission(mission);
        if (mission.waypoints?.length) {
          setStoreWaypoints(mission.waypoints);
        }
      })
      .catch((err: any) => {
        Alert.alert('Error', err?.message || 'Failed to load mission');
      })
      .finally(() => setLoadingExisting(false));
  }, [editMissionId, setMission, setStoreWaypoints]);

  useEffect(() => {
    if (routineType !== 'grid' && routineType !== 'traverse') {
      setBoundaryPoints([]);
      setDrawMode(false);
    }
  }, [routineType]);

  const centerLat = selectedAsset?.latitude ?? 40.6914;
  const centerLon = selectedAsset?.longitude ?? -74.012285;

  const waypoints = useMemo(() => {
    try {
      const lat = centerLat;
      const lon = centerLon;
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
        const boundary =
          boundaryPoints.length >= 3
            ? boundaryPoints.map(p => ({lat: p.latitude, lon: p.longitude, alt: 0}))
            : (() => {
                const offset = 0.0005;
                return [
                  {lat: lat - offset, lon: lon - offset, alt: 0},
                  {lat: lat + offset, lon: lon - offset, alt: 0},
                  {lat: lat + offset, lon: lon + offset, alt: 0},
                  {lat: lat - offset, lon: lon + offset, alt: 0},
                ];
              })();
        return generateWaypoints('grid', {
          boundary,
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
        const traverseWps =
          boundaryPoints.length >= 2
            ? boundaryPoints.map(p => ({lat: p.latitude, lon: p.longitude, alt: 0}))
            : [
                {lat, lon, alt: 0},
                {lat: lat + 0.001, lon: lon + 0.001, alt: 0},
              ];
        return generateWaypoints('traverse', {
          waypoints: traverseWps,
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
  }, [routineType, centerLat, centerLon, altitude, speed, radius, numPhotos, gimbalPitch, boundaryPoints]);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Mission name is required');
      return;
    }
    if (!selectedAsset) {
      Alert.alert('Error', 'Select an asset');
      return;
    }

    setLoading(true);
    try {
      const mission = await miraClient.createMission({
        name,
        asset_id: selectedAsset.id,
        routine_type: routineType,
        description: `${routineType} inspection of ${selectedAsset.name}`,
      });
      await miraClient.updateWaypoints(mission.id, waypoints);
      mission.waypoints = waypoints;
      setMission(mission);
      setStoreWaypoints(waypoints);
      navigation.navigate('Preflight', {missionId: mission.id});
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create mission');
    } finally {
      setLoading(false);
    }
  };

  const center = {latitude: centerLat, longitude: centerLon};

  const needsBoundary = routineType === 'grid' || routineType === 'traverse';

  const handleMapPress = useCallback(
    (e: any) => {
      if (!drawMode || isEdit) {
        return;
      }
      const {latitude, longitude} = e.nativeEvent.coordinate;
      setBoundaryPoints(prev => [...prev, {latitude, longitude}]);
    },
    [drawMode, isEdit],
  );

  if (loadingExisting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={styles.loadingText}>Loading mission...</Text>
      </View>
    );
  }

  const mapSection = (
    <View style={[styles.mapContainer, isLandscape && styles.mapLandscape]}>
      {needsBoundary && !isEdit && (
        <View style={styles.drawToolbar}>
          <TouchableOpacity
            style={[styles.drawBtn, drawMode && styles.drawBtnActive]}
            onPress={() => setDrawMode(d => !d)}>
            <Text style={[styles.drawBtnText, drawMode && styles.drawBtnTextActive]}>
              {drawMode ? '✏️ Drawing…' : '✏️ Draw'}
            </Text>
          </TouchableOpacity>
          {boundaryPoints.length > 0 && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => setBoundaryPoints([])}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
          {boundaryPoints.length > 0 && (
            <Text style={styles.ptCount}>{boundaryPoints.length} pts</Text>
          )}
        </View>
      )}
      <MapView
        style={styles.map}
        initialRegion={{
          ...center,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        region={{
          ...center,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        onPress={handleMapPress}>
        {waypoints.map((wp, i) => (
          <Marker
            key={i}
            coordinate={{latitude: wp.latitude, longitude: wp.longitude}}
            title={`WP ${wp.sequence_index}`}
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
        {routineType === 'grid' && boundaryPoints.length >= 3 && (
          <Polygon
            coordinates={boundaryPoints}
            strokeColor="#FF6F00"
            fillColor="rgba(255,111,0,0.15)"
            strokeWidth={2}
          />
        )}
        {routineType === 'traverse' && boundaryPoints.length >= 2 && (
          <Polyline
            coordinates={boundaryPoints}
            strokeColor="#FF6F00"
            strokeWidth={3}
          />
        )}
        {boundaryPoints.map((pt, i) => (
          <Marker
            key={`bp-${i}`}
            coordinate={pt}
            pinColor="#FF6F00"
            title={`Pt ${i + 1}`}
          />
        ))}
      </MapView>
      <View style={styles.waypointBadge}>
        <Text style={styles.waypointBadgeText}>
          {waypoints.length} waypoints
        </Text>
      </View>
    </View>
  );

  const formSection = (
    <ScrollView
      style={[styles.formScroll, isLandscape && styles.formScrollLandscape]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {isEdit ? 'Mission Details' : 'Plan Mission'}
        </Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Mission Name"
        value={name}
        onChangeText={setName}
        editable={!isEdit}
      />

      {!isEdit && (
        <>
          <Text style={styles.label}>Select Asset</Text>
          <View style={styles.routineRow}>
            {assets.map(a => (
              <TouchableOpacity
                key={a.id}
                style={[
                  styles.assetBtn,
                  selectedAsset?.id === a.id && styles.assetBtnActive,
                ]}
                onPress={() => setSelectedAsset(a)}>
                <Text
                  style={[
                    styles.assetText,
                    selectedAsset?.id === a.id && styles.assetTextActive,
                  ]}>
                  {a.name}
                </Text>
                <Text style={styles.assetSub}>{a.infrastructure_type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={styles.label}>Flight Routine</Text>
      <View style={styles.routineRow}>
        {ROUTINES.map(r => (
          <TouchableOpacity
            key={r}
            style={[
              styles.routineBtn,
              routineType === r && styles.routineBtnActive,
            ]}
            onPress={() => !isEdit && setRoutineType(r)}
            disabled={isEdit}>
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
        <View style={styles.thirdInput}>
          <Text style={styles.label}>Alt (m)</Text>
          <TextInput
            style={styles.input}
            value={altitude}
            onChangeText={setAltitude}
            keyboardType="numeric"
            editable={!isEdit}
          />
        </View>
        <View style={styles.thirdInput}>
          <Text style={styles.label}>Speed (m/s)</Text>
          <TextInput
            style={styles.input}
            value={speed}
            onChangeText={setSpeed}
            keyboardType="numeric"
            editable={!isEdit}
          />
        </View>
        <View style={styles.thirdInput}>
          <Text style={styles.label}>Radius (m)</Text>
          <TextInput
            style={styles.input}
            value={radius}
            onChangeText={setRadius}
            keyboardType="numeric"
            editable={!isEdit}
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
            editable={!isEdit}
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Gimbal Pitch</Text>
          <TextInput
            style={styles.input}
            value={gimbalPitch}
            onChangeText={setGimbalPitch}
            keyboardType="numeric"
            editable={!isEdit}
          />
        </View>
      </View>

      {!isLandscape && mapSection}

      {!isEdit ? (
        <TouchableOpacity
          style={[styles.createBtn, loading && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.createBtnText}>Create Mission</Text>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() =>
            navigation.navigate('Preflight', {missionId: editMissionId})
          }>
          <Text style={styles.createBtnText}>Go to Preflight</Text>
        </TouchableOpacity>
      )}

      <View style={{height: 40}} />
    </ScrollView>
  );

  if (isLandscape) {
    return (
      <View style={styles.landscapeContainer}>
        {formSection}
        {mapSection}
      </View>
    );
  }

  return formSection;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  loadingText: {color: '#666', marginTop: 12, fontSize: 15},
  landscapeContainer: {flex: 1, flexDirection: 'row', backgroundColor: '#FFF'},
  formScroll: {flex: 1, backgroundColor: '#FFF', padding: 16},
  formScrollLandscape: {flex: 1, maxWidth: '50%' as any},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
    gap: 12,
  },
  backBtn: {fontSize: 16, color: TEAL, fontWeight: '600'},
  title: {fontSize: 22, fontWeight: '700', color: '#333'},
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
  assetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    marginRight: 8,
    marginBottom: 8,
  },
  assetBtnActive: {backgroundColor: TEAL, borderColor: TEAL},
  assetText: {fontSize: 13, color: '#333', fontWeight: '600'},
  assetTextActive: {color: '#FFF'},
  assetSub: {fontSize: 10, color: '#999', marginTop: 2},
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
  mapLandscape: {
    flex: 1,
    height: 'auto' as any,
    borderRadius: 0,
    borderWidth: 0,
    margin: 0,
  },
  drawToolbar: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  drawBtn: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  drawBtnActive: {backgroundColor: '#FF6F00', borderColor: '#FF6F00'},
  drawBtnText: {fontSize: 12, fontWeight: '600', color: '#333'},
  drawBtnTextActive: {color: '#FFF'},
  clearBtn: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  clearBtnText: {fontSize: 12, fontWeight: '600', color: '#F44336'},
  ptCount: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  map: {flex: 1},
  waypointBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  waypointBadgeText: {color: '#FFF', fontSize: 12, fontWeight: '600'},
  createBtn: {
    backgroundColor: TEAL,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  createBtnDisabled: {opacity: 0.6},
  createBtnText: {color: '#FFF', fontSize: 16, fontWeight: '600'},
});
