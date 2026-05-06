import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useMissionStore} from '../store/missionStore';
import {RootStackParamList} from '../App';

const TEAL = '#00897B';

interface CheckItem {
  id: string;
  label: string;
  category: string;
  required: boolean;
}

const CHECKLIST: CheckItem[] = [
  {id: 'battery', label: 'Battery >50%', category: 'Aircraft', required: true},
  {id: 'propellers', label: 'Propellers inspected', category: 'Aircraft', required: true},
  {id: 'sd_card', label: 'SD card inserted', category: 'Aircraft', required: true},
  {id: 'h20t', label: 'H20T payload mounted', category: 'Payload', required: true},
  {id: 'gimbal', label: 'Gimbal moves freely', category: 'Payload', required: true},
  {id: 'wind', label: 'Wind <15 m/s', category: 'Environment', required: true},
  {id: 'no_rain', label: 'No rain / precipitation', category: 'Environment', required: true},
  {id: 'laanc', label: 'LAANC authorization', category: 'Airspace', required: true},
  {id: 'no_tfr', label: 'No active TFRs', category: 'Airspace', required: true},
  {id: 'part107', label: 'Part 107 current', category: 'Operator', required: true},
  {id: 'observer', label: 'Visual observer present', category: 'Operator', required: true},
];

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function PreflightScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<any>();
  const missionId = route.params?.missionId;
  const {width, height} = useWindowDimensions();
  const isLandscape = width > height;
  const mission = useMissionStore(s => s.currentMission);
  const waypoints = useMissionStore(s => s.waypoints);

  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setChecked(prev => ({...prev, [id]: !prev[id]}));
  };

  const allRequired = useMemo(
    () => CHECKLIST.filter(c => c.required).every(c => checked[c.id]),
    [checked],
  );

  const categories = [...new Set(CHECKLIST.map(c => c.category))];

  const handleStart = () => {
    navigation.navigate('Hud', {missionId});
  };

  const checklistContent = (
    <ScrollView style={styles.scrollArea}>
      {categories.map(cat => (
        <View key={cat} style={styles.categorySection}>
          <Text style={styles.categoryTitle}>{cat}</Text>
          {CHECKLIST.filter(c => c.category === cat).map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.checkRow}
              onPress={() => toggleItem(item.id)}>
              <View
                style={[
                  styles.checkbox,
                  checked[item.id] && styles.checkboxChecked,
                ]}>
                {checked[item.id] && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
              <Text style={styles.checkLabel}>{item.label}</Text>
              {item.required && <Text style={styles.required}>*</Text>}
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </ScrollView>
  );

  const summaryPanel = (
    <View style={[styles.summaryPanel, isLandscape && styles.summaryLandscape]}>
      <Text style={styles.summaryTitle}>Mission Summary</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Name</Text>
        <Text style={styles.summaryValue}>{mission?.name || '-'}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Routine</Text>
        <Text style={styles.summaryValue}>{mission?.routine_type || '-'}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Waypoints</Text>
        <Text style={styles.summaryValue}>{waypoints.length}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Status</Text>
        <Text style={styles.summaryValue}>{mission?.status || '-'}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Preflight Checklist</Text>
      </View>

      {isLandscape ? (
        <View style={styles.landscapeBody}>
          <View style={styles.landscapeLeft}>
            {checklistContent}
          </View>
          {summaryPanel}
        </View>
      ) : (
        <>
          {summaryPanel}
          {checklistContent}
        </>
      )}

      <View style={styles.footer}>
        <Text style={styles.waypointInfo}>
          {waypoints.length} waypoints loaded · {
            CHECKLIST.filter(c => c.required).filter(c => checked[c.id]).length
          }/{CHECKLIST.filter(c => c.required).length} checks passed
        </Text>
        <TouchableOpacity
          style={[styles.startBtn, !allRequired && styles.startBtnDisabled]}
          onPress={handleStart}
          disabled={!allRequired}>
          <Text style={styles.startBtnText}>Start Mission</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFF'},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
    gap: 12,
  },
  backBtn: {fontSize: 16, color: TEAL, fontWeight: '600'},
  title: {fontSize: 22, fontWeight: '700', color: '#333'},
  landscapeBody: {flex: 1, flexDirection: 'row'},
  landscapeLeft: {flex: 1},
  summaryPanel: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  summaryLandscape: {
    width: 280,
    marginHorizontal: 0,
    marginRight: 16,
    marginBottom: 0,
    borderRadius: 12,
  },
  summaryTitle: {fontSize: 15, fontWeight: '700', color: TEAL, marginBottom: 12},
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {fontSize: 13, color: '#999'},
  summaryValue: {fontSize: 13, fontWeight: '600', color: '#333'},
  scrollArea: {flex: 1, paddingHorizontal: 16},
  categorySection: {marginBottom: 16},
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEAL,
    marginBottom: 8,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#CCC',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {backgroundColor: TEAL, borderColor: TEAL},
  checkmark: {color: '#FFF', fontSize: 14, fontWeight: '700'},
  checkLabel: {flex: 1, fontSize: 15, color: '#333'},
  required: {color: '#F44336', fontSize: 16, fontWeight: '700'},
  footer: {padding: 16, borderTopWidth: 1, borderTopColor: '#EEE'},
  waypointInfo: {
    textAlign: 'center',
    color: '#666',
    fontSize: 13,
    marginBottom: 12,
  },
  startBtn: {
    backgroundColor: TEAL,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  startBtnDisabled: {backgroundColor: '#CCC'},
  startBtnText: {color: '#FFF', fontSize: 16, fontWeight: '600'},
});
