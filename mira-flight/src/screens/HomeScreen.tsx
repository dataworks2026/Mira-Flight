import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {miraClient} from '../api/miraClient';
import {Mission} from '../types/shared';
import {useDroneStore} from '../store/droneStore';
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

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const connected = useDroneStore(s => s.connected);

  const fetchMissions = useCallback(async () => {
    try {
      const data = await miraClient.getMissions();
      setMissions(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMissions();
    setRefreshing(false);
  };

  const renderMission = ({item}: {item: Mission}) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('MissionPlanner', {missionId: item.id})
      }>
      <View style={styles.cardHeader}>
        <Text style={styles.routineIcon}>
          {ROUTINE_ICONS[item.routine_type] || '?'}
        </Text>
        <Text style={styles.missionName}>{item.name}</Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === 'completed' ? '#4CAF50' : '#FF9800',
            },
          ]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.assetName}>{item.asset_name}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.photoCount}>📷 {item.photo_count || 0}</Text>
        <Text style={styles.date}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mira Flight</Text>
        <View
          style={[
            styles.connectionDot,
            {backgroundColor: connected ? '#4CAF50' : '#F44336'},
          ]}
        />
      </View>

      <FlatList
        data={missions}
        renderItem={renderMission}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
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
  connectionDot: {width: 12, height: 12, borderRadius: 6},
  list: {padding: 16},
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: MINT,
    elevation: 2,
  },
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
