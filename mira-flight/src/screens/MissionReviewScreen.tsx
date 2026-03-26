import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useMissionStore} from '../store/missionStore';
import {RootStackParamList} from '../App';

const TEAL = '#00897B';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function MissionReviewScreen() {
  const navigation = useNavigation<NavProp>();
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
      value: `${photosCount}`,
      icon: '📷',
    },
    {
      title: 'Upload Progress',
      value: `${uploadedCount}/${photosCount} uploaded`,
      icon: '☁️',
    },
    {
      title: 'Analysis Status',
      value: missionState,
      icon: '🔍',
    },
    {
      title: 'ODM Processing',
      value: missionState === 'COMPLETED' ? 'Complete' : 'Pending',
      icon: '🗺️',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mission Complete</Text>
      <Text style={styles.subtitle}>{mission?.name || 'Mission'}</Text>

      <ScrollView style={styles.cards}>
        {cards.map((card, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.cardIcon}>{card.icon}</Text>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardValue}>{card.value}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.dashboardBtn}
          onPress={() =>
            Linking.openURL(
              `http://3.144.48.124:3000/missions/${mission?.id || ''}`,
            )
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
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: TEAL,
    textAlign: 'center',
    marginTop: 48,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  cards: {flex: 1, paddingHorizontal: 16},
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
  cardIcon: {fontSize: 28, marginRight: 16},
  cardContent: {flex: 1},
  cardTitle: {fontSize: 13, color: '#999', fontWeight: '600'},
  cardValue: {fontSize: 18, color: '#333', fontWeight: '700', marginTop: 2},
  footer: {padding: 16},
  dashboardBtn: {
    borderWidth: 2,
    borderColor: TEAL,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  dashboardBtnText: {color: TEAL, fontSize: 15, fontWeight: '600'},
  homeBtn: {
    backgroundColor: TEAL,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  homeBtnText: {color: '#FFF', fontSize: 16, fontWeight: '600'},
});
