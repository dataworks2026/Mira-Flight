import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  useWindowDimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useMissionStore} from '../store/missionStore';
import {RootStackParamList} from '../App';

const TEAL = '#00897B';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function MissionReviewScreen() {
  const navigation = useNavigation<NavProp>();
  const {width, height} = useWindowDimensions();
  const isLandscape = width > height;
  const mission = useMissionStore(s => s.currentMission);
  const photosCount = useMissionStore(s => s.photosCount);
  const uploadedCount = useMissionStore(s => s.uploadedCount);
  const missionState = useMissionStore(s => s.missionState);
  const reset = useMissionStore(s => s.reset);

  const handleReturnHome = () => {
    reset();
    navigation.navigate('Home');
  };

  const cards = [
    {
      title: 'Photos Captured',
      value: `${mission?.total_photos || photosCount}`,
      icon: '📷',
    },
    {
      title: 'Upload Progress',
      value: `${mission?.photos_uploaded || uploadedCount}/${mission?.total_photos || photosCount} uploaded`,
      icon: '☁️',
    },
    {
      title: 'Analysis Status',
      value: mission?.status || missionState,
      icon: '🔍',
    },
    {
      title: 'ODM Processing',
      value: mission?.odm_status || (missionState === 'COMPLETED' ? 'Complete' : 'Pending'),
      icon: '🗺️',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Mission Complete</Text>
          <Text style={styles.subtitle}>{mission?.name || 'Mission'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.cards}
        contentContainerStyle={isLandscape ? styles.cardsLandscape : undefined}>
        {cards.map((card, i) => (
          <View key={i} style={[styles.card, isLandscape && styles.cardLandscape]}>
            <Text style={styles.cardIcon}>{card.icon}</Text>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardValue}>{card.value}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, isLandscape && styles.footerLandscape]}>
        <TouchableOpacity
          style={styles.dashboardBtn}
          onPress={() =>
            Linking.openURL('http://3.144.48.124/dashboard')
          }>
          <Text style={styles.dashboardBtnText}>Open Web Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.homeBtn} onPress={handleReturnHome}>
          <Text style={styles.homeBtnText}>Return Home</Text>
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
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: TEAL,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  cards: {flex: 1, paddingHorizontal: 16},
  cardsLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  cardLandscape: {
    width: '48%' as any,
    marginBottom: 0,
  },
  cardIcon: {fontSize: 28, marginRight: 16},
  cardContent: {flex: 1},
  cardTitle: {fontSize: 13, color: '#999', fontWeight: '600'},
  cardValue: {fontSize: 18, color: '#333', fontWeight: '700', marginTop: 2},
  footer: {padding: 16},
  footerLandscape: {flexDirection: 'row', gap: 12},
  dashboardBtn: {
    borderWidth: 2,
    borderColor: TEAL,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
    flex: 1,
  },
  dashboardBtnText: {color: TEAL, fontSize: 15, fontWeight: '600'},
  homeBtn: {
    backgroundColor: TEAL,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
  },
  homeBtnText: {color: '#FFF', fontSize: 16, fontWeight: '600'},
});
