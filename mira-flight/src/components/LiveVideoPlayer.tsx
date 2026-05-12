import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';

interface Props {
  streamUrl?: string;
  style?: object;
}

export default function LiveVideoPlayer({streamUrl, style}: Props) {
  const [expanded, setExpanded] = useState(false);
  const isOnline = Boolean(streamUrl);

  if (!expanded) {
    return (
      <TouchableOpacity
        style={[styles.collapsed, style]}
        onPress={() => setExpanded(true)}
        activeOpacity={0.8}>
        <Text style={styles.icon}>{isOnline ? '📹' : '📷'}</Text>
        <Text style={styles.collapsedLabel}>
          {isOnline ? 'LIVE' : 'CAM'}
        </Text>
        {isOnline && <View style={styles.liveDot} />}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.panel, style]}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>
          {isOnline ? '● LIVE FEED' : 'VIDEO'}
        </Text>
        <TouchableOpacity onPress={() => setExpanded(false)}>
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.videoArea}>
        {isOnline ? (
          <Text style={styles.streamingText}>
            {'HLS stream wired — DJI SDK integration pending'}
          </Text>
        ) : (
          <>
            <Text style={styles.offlineIcon}>📡</Text>
            <Text style={styles.offlineText}>Stream Offline</Text>
            <Text style={styles.offlineSubtext}>
              Connect DJI RC or enable RTMP
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  collapsed: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    width: 52,
  },
  icon: {fontSize: 18},
  collapsedLabel: {color: '#AAA', fontSize: 9, marginTop: 2, fontWeight: '700'},
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F44336',
    marginTop: 3,
  },
  panel: {
    backgroundColor: 'rgba(10,10,10,0.92)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
    width: 220,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerLabel: {color: '#F44336', fontSize: 11, fontWeight: '800'},
  closeBtn: {color: '#888', fontSize: 14, paddingLeft: 8},
  videoArea: {
    height: 124,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  streamingText: {
    color: '#555',
    fontSize: 10,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  offlineIcon: {fontSize: 28, marginBottom: 8},
  offlineText: {color: '#666', fontSize: 13, fontWeight: '600'},
  offlineSubtext: {color: '#444', fontSize: 10, marginTop: 4, textAlign: 'center'},
});
