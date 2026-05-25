import React, {useState} from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {useLogStore, LogEntry, miraLog} from '../store/logStore';
import {T, spacing, fontFamily, radius} from '../theme/tokens';

const LEVEL_COLOR: Record<string, string> = {
  debug: T.t3,
  info:  T.t2,
  warn:  T.amber,
  error: T.red,
};

function LogRow({item}: {item: LogEntry}) {
  return (
    <View style={s.row}>
      <Text style={[s.level, {color: LEVEL_COLOR[item.level] ?? T.t2}]}>
        {item.level.toUpperCase().padEnd(5)}
      </Text>
      <Text style={s.tag} numberOfLines={1}>
        {item.tag}
      </Text>
      <Text style={s.msg} numberOfLines={2}>
        {item.msg}
      </Text>
      <Text style={s.ts}>{new Date(item.ts).toISOString().slice(11, 23)}</Text>
    </View>
  );
}

export function DebugLogOverlay() {
  const [visible, setVisible] = useState(false);
  const entries = useLogStore(st => st.entries);
  const clear = useLogStore(st => st.clear);
  const flush = useLogStore(st => st.flush);

  const reversed = [...entries].reverse();

  return (
    <>
      {/* Long-press zone — bottom-left corner, 60×60, invisible */}
      <TouchableWithoutFeedback
        onLongPress={() => setVisible(true)}
        delayLongPress={800}>
        <View style={s.trigger} />
      </TouchableWithoutFeedback>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}>
        <View style={s.backdrop}>
          <View style={s.panel}>
            {/* Header */}
            <View style={s.hdr}>
              <Text style={s.hdrTitle}>DEBUG LOG</Text>
              <Text style={s.hdrCount}>{entries.length} / 2000</Text>
              <TouchableOpacity
                style={s.hdrBtn}
                onPress={() =>
                flush().catch(e =>
                  miraLog('error', 'DebugLog', String(e)),
                )
              }>
                <Text style={s.hdrBtnTxt}>SAVE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.hdrBtn} onPress={clear}>
                <Text style={s.hdrBtnTxt}>CLEAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.closeBtn}
                onPress={() => setVisible(false)}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Text style={s.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Log list — newest first */}
            <FlatList<LogEntry>
              data={reversed}
              keyExtractor={(_, i) => String(i)}
              style={s.list}
              removeClippedSubviews
              initialNumToRender={30}
              maxToRenderPerBatch={30}
              renderItem={({item}) => <LogRow item={item} />}
              ListEmptyComponent={
                <Text style={s.empty}>No log entries yet.</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  trigger: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 60,
    height: 60,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  panel: {
    height: '72%',
    backgroundColor: T.panel,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: T.hairline,
    overflow: 'hidden',
  },
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: T.hairline,
    gap: spacing.sm,
    backgroundColor: T.panelHi,
  },
  hdrTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: T.t1,
    letterSpacing: 0.12,
    fontFamily: fontFamily.mono,
  },
  hdrCount: {fontSize: 10, color: T.t3, fontFamily: fontFamily.mono},
  hdrBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: T.hairline,
  },
  hdrBtnTxt: {fontSize: 10, fontWeight: '700', color: T.t2},
  closeBtn: {paddingHorizontal: 4},
  closeTxt: {fontSize: 16, color: T.t2},
  list: {flex: 1},
  empty: {
    textAlign: 'center',
    color: T.t3,
    marginTop: 40,
    fontSize: 13,
    fontFamily: fontFamily.mono,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: T.hairline2,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  level: {
    fontSize: 9,
    fontFamily: fontFamily.mono,
    fontWeight: '700',
    width: 36,
  },
  tag: {
    fontSize: 9,
    color: T.cyan,
    fontFamily: fontFamily.mono,
    width: 72,
  },
  msg: {flex: 1, fontSize: 10, color: T.t2, fontFamily: fontFamily.mono},
  ts: {fontSize: 9, color: T.t3, fontFamily: fontFamily.mono, width: 84},
});
