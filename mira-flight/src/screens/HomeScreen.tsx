import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {miraClient} from '../api/miraClient';
import {Mission} from '../types/shared';
import {useMissionStore} from '../store/missionStore';
import {useAuthStore} from '../store/authStore';
import {RootStackParamList} from '../App';

const TEAL = '#00897B';
const MINT = '#B2DFDB';

const ROUTINE_ICONS: Record<string, string> = {
  sweep: '↔',
  orbit: '⟳',
  grid: '▦',
  traverse: '⤴',
  crawl: '↕',
  scout: '◎',
};

const STATUS_COLORS: Record<string, string> = {
  completed: '#4CAF50',
  in_progress: '#2196F3',
  planned: '#FF9800',
  created: '#9E9E9E',
  aborted: '#F44336',
};

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const {width} = useWindowDimensions();
  const isLandscape = width > 600;
  const [missions, setMissions] = useState<Mission[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMission, setLoadingMission] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const setMission = useMissionStore(s => s.setMission);
  const setWaypoints = useMissionStore(s => s.setWaypoints);
  const logout = useAuthStore(s => s.logout);

  const fetchMissions = useCallback(async () => {
    try {
      const data = await miraClient.getMissions();
      setMissions(data);
      setBackendOnline(true);
    } catch (err: any) {
      setBackendOnline(false);
      console.warn('Failed to fetch missions:', err?.message);
    }
  }, []);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMissions();
    setRefreshing(false);
  };

  const handleMissionPress = async (item: Mission) => {
    if (item.status === 'completed' || item.status === 'aborted') {
      setMission(item);
      navigation.navigate('MissionReview', {missionId: item.id});
      return;
    }

    setLoadingMission(item.id);
    try {
      const mission = await miraClient.getMission(item.id);
      setMission(mission);
      setWaypoints(mission.waypoints || []);

      if (mission.status === 'in_progress') {
        navigation.navigate('Hud', {missionId: mission.id});
      } else {
        navigation.navigate('Preflight', {missionId: mission.id});
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load mission');
    } finally {
      setLoadingMission(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigation.reset({index: 0, routes: [{name: 'Login'}]});
  };

  const renderMission = ({item}: {item: Mission}) => (
    <TouchableOpacity
      style={[styles.card, isLandscape && styles.cardLandscape]}
      onPress={() => handleMissionPress(item)}
      disabled={loadingMission === item.id}>
      <View style={styles.cardHeader}>
        <Text style={styles.routineIcon}>
          {ROUTINE_ICONS[item.routine_type] || '?'}
        </Text>
        <Text style={styles.missionName} numberOfLines={1}>
          {item.name}
        </Text>
        {loadingMission === item.id ? (
          <ActivityIndicator size="small" color={TEAL} />
        ) : (
          <View
            style={[
              styles.statusBadge,
              {backgroundColor: STATUS_COLORS[item.status] || '#FF9800'},
            ]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        )}
      </View>
      <Text style={styles.assetName}>{item.description || item.asset_id}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.photoCount}>
          📷 {item.total_photos || 0}
          {item.total_waypoints ? ` · ${item.total_waypoints} WP` : ''}
        </Text>
        <Text style={styles.date}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mira Flight</Text>
          <Text style={styles.headerSub}>Ground Control Station</Text>
        </View>
        <View style={styles.headerRight}>
          <View
            style={[
              styles.connectionDot,
              {backgroundColor: backendOnline ? '#4CAF50' : '#F44336'},
            ]}
          />
          <TouchableOpacity
            onPress={() => navigation.navigate('Fleet')}
            style={[styles.logoutBtn, {backgroundColor: 'rgba(0,212,255,0.25)'}]}>
            <Text style={styles.logoutText}>Fleet</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={missions}
        renderItem={renderMission}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        numColumns={isLandscape ? 2 : 1}
        key={isLandscape ? 'landscape' : 'portrait'}
        columnWrapperStyle={isLandscape ? styles.columnWrapper : undefined}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No missions yet. Create one!</Text>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('MissionPlanner', {})}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F5F5F5'},
  header: {
    backgroundColor: TEAL,
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {color: '#FFF', fontSize: 22, fontWeight: '700'},
  headerSub: {color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2},
  headerRight: {flexDirection: 'row', alignItems: 'center', gap: 12},
  connectionDot: {width: 12, height: 12, borderRadius: 6},
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  logoutText: {color: '#FFF', fontSize: 12, fontWeight: '600'},
  list: {padding: 16},
  columnWrapper: {gap: 12},
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: MINT,
    elevation: 2,
  },
  cardLandscape: {flex: 1},
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  routineIcon: {fontSize: 20, marginRight: 8},
  missionName: {flex: 1, fontSize: 16, fontWeight: '600', color: '#333'},
  statusBadge: {borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2},
  statusText: {color: '#FFF', fontSize: 11, fontWeight: '600'},
  assetName: {color: '#666', fontSize: 13, marginBottom: 8},
  cardFooter: {flexDirection: 'row', justifyContent: 'space-between'},
  photoCount: {color: '#666', fontSize: 12},
  date: {color: '#999', fontSize: 12},
  empty: {textAlign: 'center', color: '#999', marginTop: 60, fontSize: 16},
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  fabText: {color: '#FFF', fontSize: 28, fontWeight: '300', marginTop: -2},
});
