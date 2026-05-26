import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {miraClient} from '../api/miraClient';
import {Mission} from '../types/shared';
import {useMissionStore} from '../store/missionStore';
import {useAuthStore} from '../store/authStore';
import {useConnectionStore, ConnectionStatus} from '../store/connectionStore';
import {RootStackParamList} from '../App';
import {T, radius, spacing, fontSize, fontFamily} from '../theme/tokens';

// ── Status maps ───────────────────────────────────────────────────────────────

const TONE: Record<string, string> = {
  created:     T.slate,
  planned:     T.cyan,
  in_progress: T.green,
  completed:   T.green,
  aborted:     T.red,
};

const STATUS_LABEL: Record<string, string> = {
  created:     'DRAFT',
  planned:     'PLANNED',
  in_progress: 'IN FLIGHT',
  completed:   'COMPLETE',
  aborted:     'ABORTED',
};

type FilterKey = 'all' | 'in_progress' | 'completed' | 'aborted' | 'created' | 'planned';

const FILTERS: {key: FilterKey; label: string}[] = [
  {key: 'all',         label: 'All'},
  {key: 'in_progress', label: 'In flight'},
  {key: 'completed',   label: 'Complete'},
  {key: 'aborted',     label: 'Aborted'},
  {key: 'planned',     label: 'Planned'},
  {key: 'created',     label: 'Draft'},
];

const CONN_COLOR: Record<ConnectionStatus, string> = {
  connected:    T.green,
  connecting:   T.amber,
  disconnected: T.slate,
  failed:       T.red,
};

const CONN_LABEL: Record<ConnectionStatus, string> = {
  connected:    'OK',
  connecting:   'CONNECTING',
  disconnected: 'OFFLINE',
  failed:       'FAILED',
};

type OverflowAction = {key: string; label: string; danger?: boolean};
const OVERFLOW_ACTIONS: OverflowAction[] = [
  {key: 'duplicate', label: 'Duplicate'},
  {key: 'rename',    label: 'Rename'},
  {key: 'export',    label: 'Export'},
  {key: 'archive',   label: 'Archive'},
  {key: 'delete',    label: 'Delete', danger: true},
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDur(sec: number): string {
  if (!sec) {return '—';}
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const sv = Math.floor(sec % 60);
  if (h > 0) {return `${h}:${String(m).padStart(2, '0')}:${String(sv).padStart(2, '0')}`;}
  return `${m}:${String(sv).padStart(2, '0')}`;
}

function isThisWeek(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  mon.setHours(0, 0, 0, 0);
  return d >= mon && d <= now;
}

function isLast30Days(iso: string): boolean {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return new Date(iso) >= cutoff;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
  });
}

function buildSub(m: Mission): string {
  switch (m.status) {
    case 'aborted':
      return m.description ? `aborted · ${m.description}` : 'aborted by operator';
    case 'in_progress':
      return 'in flight · mission active';
    case 'completed':
      return `${m.routine_type} · ${m.total_photos} photos`;
    case 'planned':
      return 'scheduled · awaiting flight window';
    default:
      return 'draft · awaiting flight window';
  }
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({label, value}: {label: string; value: string}) {
  return (
    <View style={kpiSt.card}>
      <Text style={kpiSt.lbl}>{label}</Text>
      <Text style={kpiSt.val}>{value}</Text>
    </View>
  );
}

const kpiSt = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: T.card,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: T.hairline,
    alignItems: 'center',
  },
  lbl: {
    fontSize: 9,
    fontFamily: fontFamily.mono,
    color: T.t3,
    letterSpacing: 0.12,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  val: {
    fontSize: fontSize.cardTitle,
    fontWeight: '700',
    color: T.t1,
    fontFamily: fontFamily.mono,
  },
});

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({status}: {status: string}) {
  const c = TONE[status] ?? T.slate;
  const l = STATUS_LABEL[status] ?? status.toUpperCase();
  return (
    <View style={[pillSt.wrap, {borderColor: `${c}55`, backgroundColor: `${c}18`}]}>
      <View style={[pillSt.dot, {backgroundColor: c}]} />
      <Text style={[pillSt.txt, {color: c}]}>{l}</Text>
    </View>
  );
}

const pillSt = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: 4,
  },
  dot: {width: 5, height: 5, borderRadius: 999},
  txt: {fontSize: 9, fontWeight: '700', letterSpacing: 0.1},
});

// ── Stat cell ─────────────────────────────────────────────────────────────────

function StatCell({icon, lbl, val}: {icon: string; lbl: string; val: string}) {
  return (
    <View style={statSt.cell}>
      <Text style={statSt.icon}>{icon}</Text>
      <View>
        <Text style={statSt.lbl}>{lbl}</Text>
        <Text style={statSt.val}>{val}</Text>
      </View>
    </View>
  );
}

const statSt = StyleSheet.create({
  cell: {flexDirection: 'row', alignItems: 'center', gap: 3},
  icon: {fontSize: 11},
  lbl: {
    fontSize: 8,
    color: T.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
    fontFamily: fontFamily.mono,
  },
  val: {fontSize: 10, color: T.t2, fontFamily: fontFamily.mono},
});

// ── Mission card ──────────────────────────────────────────────────────────────

function MissionCard({
  item,
  loading,
  onPress,
  onOverflow,
}: {
  item: Mission;
  loading: boolean;
  onPress: () => void;
  onOverflow: () => void;
}) {
  const tone = TONE[item.status] ?? T.slate;
  return (
    <TouchableOpacity
      style={[mcSt.wrap, {borderLeftColor: tone}]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.78}>
      <View style={mcSt.hdr}>
        <View style={[mcSt.dot, {backgroundColor: tone}]} />
        <Text style={mcSt.name} numberOfLines={1}>
          {item.name}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={T.cyan} />
        ) : (
          <StatusPill status={item.status} />
        )}
      </View>
      <Text style={mcSt.sub} numberOfLines={1}>
        {buildSub(item)}
      </Text>
      <View style={mcSt.line} />
      <View style={mcSt.ftr}>
        <StatCell icon="📷" lbl="PHOTOS" val={String(item.total_photos ?? 0)} />
        {(item.total_waypoints ?? 0) > 0 && (
          <StatCell icon="📍" lbl="WP" val={String(item.total_waypoints)} />
        )}
        <StatCell icon="⏱" lbl="DUR" val={fmtDur(item.flight_duration_s ?? 0)} />
        <View style={mcSt.spacer} />
        <Text style={mcSt.date}>{fmtDate(item.created_at)}</Text>
        <TouchableOpacity onPress={onOverflow} activeOpacity={0.6} style={mcSt.moreBtn}>
          <Text style={mcSt.more}>⋯</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const mcSt = StyleSheet.create({
  wrap: {
    backgroundColor: T.card,
    borderRadius: radius.card,
    borderLeftWidth: 3,
    overflow: 'hidden',
    padding: spacing.md,
  },
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 6,
  },
  dot: {width: 7, height: 7, borderRadius: 999},
  name: {flex: 1, fontSize: fontSize.body, fontWeight: '600', color: T.t1},
  sub: {fontSize: 12, color: T.t2, marginBottom: 8},
  line: {height: 1, backgroundColor: T.hairline, marginBottom: 8},
  ftr: {flexDirection: 'row', alignItems: 'center', gap: 8},
  spacer: {flex: 1},
  date: {fontSize: 10, color: T.t3},
  more: {color: T.t2, fontSize: 16},
  moreBtn: {padding: spacing.sm, margin: -spacing.sm},
});

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <View style={skelSt.wrap}>
      <View style={skelSt.hdr} />
      <View style={skelSt.line} />
      <View style={skelSt.ftr} />
    </View>
  );
}

const skelSt = StyleSheet.create({
  wrap: {
    backgroundColor: T.card,
    borderRadius: radius.card,
    borderLeftWidth: 3,
    borderLeftColor: T.panelHi,
    overflow: 'hidden',
    padding: spacing.md,
  },
  hdr: {
    height: 14,
    backgroundColor: T.panelHi,
    borderRadius: 4,
    marginBottom: 10,
    width: '70%',
  },
  line: {height: 1, backgroundColor: T.hairline, marginBottom: 10},
  ftr: {
    height: 10,
    backgroundColor: T.panelHi,
    borderRadius: 4,
    width: '50%',
  },
});

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyPanel({onNew}: {onNew: () => void}) {
  return (
    <View style={empSt.wrap}>
      <Text style={empSt.eye}>EMPTY MISSION QUEUE</Text>
      <Text style={empSt.h2}>Plan your first mission</Text>
      <Text style={empSt.body}>
        Choose a routine template — Orbit, Façade, Grid, Perimeter, Corridor, or
        Manual — and the app generates waypoints automatically.
      </Text>
      <TouchableOpacity style={empSt.cta} onPress={onNew}>
        <Text style={empSt.ctaTxt}>CREATE FIRST MISSION</Text>
      </TouchableOpacity>
    </View>
  );
}

const empSt = StyleSheet.create({
  wrap: {
    margin: spacing.xl,
    padding: spacing.xxl,
    backgroundColor: T.panel,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: T.hairline,
    alignItems: 'center',
  },
  eye: {
    fontSize: 10,
    fontFamily: fontFamily.mono,
    color: T.t3,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700',
    color: T.t1,
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    fontSize: 13,
    color: T.t2,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  cta: {
    backgroundColor: T.cyan,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.btn,
  },
  ctaTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: T.bg,
    letterSpacing: 0.15,
  },
});

// ── Screen ────────────────────────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [initialLoading, setInitialLoading] = useState(true);
  const [overflowMission, setOverflowMission] = useState<Mission | null>(null);

  const setMission = useMissionStore(s => s.setMission);
  const setWaypoints = useMissionStore(s => s.setWaypoints);
  const logout = useAuthStore(s => s.logout);
  const connStatus = useConnectionStore(s => s.status);
  const connAdapterType = useConnectionStore(s => s.config.adapterType);

  const fetchMissions = useCallback(async () => {
    try {
      const data = await miraClient.getMissions();
      setMissions(data);
    } catch {
      // network errors are non-fatal; user can pull-to-refresh
    } finally {
      setInitialLoading(false);
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

  const handleMissionPress = useCallback(
    async (item: Mission) => {
      if (item.status === 'completed' || item.status === 'aborted') {
        setMission(item);
        nav.navigate('MissionReview', {missionId: item.id});
        return;
      }
      setLoadingId(item.id);
      try {
        const m = await miraClient.getMission(item.id);
        setMission(m);
        setWaypoints(m.waypoints || []);
        if (m.status === 'in_progress') {
          nav.navigate('Hud', {missionId: m.id});
        } else {
          nav.navigate('Preflight', {missionId: m.id});
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load mission';
        Alert.alert('Error', msg);
      } finally {
        setLoadingId(null);
      }
    },
    [nav, setMission, setWaypoints],
  );

  const handleLogout = useCallback(() => {
    logout();
    nav.reset({index: 0, routes: [{name: 'Login'}]});
  }, [logout, nav]);

  const handleOverflowAction = useCallback(
    async (key: string, mission: Mission) => {
      switch (key) {
        case 'duplicate':
          try {
            await miraClient.createMission({
              name: `${mission.name} (copy)`,
              routine_type: mission.routine_type,
              asset_id: mission.asset_id,
              description: mission.description,
            });
            await fetchMissions();
          } catch {
            Alert.alert('Error', 'Could not duplicate mission');
          }
          break;
        case 'export':
          try {
            await Share.share({message: JSON.stringify(mission, null, 2)});
          } catch {
            // user cancelled share sheet
          }
          break;
        default:
          Alert.alert(
            key.charAt(0).toUpperCase() + key.slice(1),
            'Coming soon',
          );
      }
    },
    [fetchMissions],
  );

  // KPI computations
  const thisWeekMissions = useMemo(
    () => missions.filter(m => isThisWeek(m.actual_start ?? m.created_at)),
    [missions],
  );

  const kpiData = useMemo(
    () => ({
      week: thisWeekMissions.length,
      photos: thisWeekMissions.reduce((n, m) => n + (m.total_photos ?? 0), 0),
      queue: missions.filter(m => m.status === 'in_progress').length,
      flight: thisWeekMissions.reduce(
        (n, m) => n + (m.flight_duration_s ?? 0),
        0,
      ),
      assets: new Set(
        missions
          .filter(m => isLast30Days(m.actual_start ?? m.created_at))
          .map(m => m.asset_id),
      ).size,
    }),
    [missions, thisWeekMissions],
  );

  const shown = useMemo(
    () =>
      filter === 'all' ? missions : missions.filter(m => m.status === filter),
    [missions, filter],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {all: missions.length};
    for (const m of missions) {
      c[m.status] = (c[m.status] ?? 0) + 1;
    }
    return c;
  }, [missions]);

  const connDot = CONN_COLOR[connStatus] ?? T.slate;
  const connLbl = CONN_LABEL[connStatus] ?? connStatus;

  const listHeader = (
    <>
      {/* Page header */}
      <View style={s.pageHdr}>
        <View>
          <Text style={s.pageTitle}>HOME</Text>
          <Text style={s.pageSub}>Missions</Text>
          <Text style={s.pageMeta}>{missions.length} total</Text>
        </View>
        <TouchableOpacity
          style={s.newBtn}
          onPress={() => nav.navigate('MissionPlanner', {})}>
          <Text style={s.newBtnTxt}>+ NEW MISSION</Text>
        </TouchableOpacity>
      </View>

      {/* KPI strip */}
      <View style={s.kpiRow}>
        <KpiCard label="THIS WEEK" value={String(kpiData.week)} />
        <KpiCard label="PHOTOS" value={String(kpiData.photos)} />
        <KpiCard label="UPLOAD Q" value={String(kpiData.queue)} />
        <KpiCard label="FLIGHT TIME" value={fmtDur(kpiData.flight)} />
        <KpiCard label="ASSETS" value={String(kpiData.assets)} />
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.fpScroll}
        contentContainerStyle={s.fpRow}>
        {FILTERS.map(f => {
          const on = filter === f.key;
          const cnt = counts[f.key] ?? 0;
          return (
            <TouchableOpacity
              key={f.key}
              style={[s.fp, on && s.fpOn]}
              onPress={() => setFilter(f.key)}>
              <Text style={[s.fpTxt, on && s.fpTxtOn]}>
                {f.label}
                {cnt > 0 ? ` ${cnt}` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </>
  );

  return (
    <View style={s.root}>
      {/* ── Top strip ──────────────────────────────────────────────────────── */}
      <View style={s.strip}>
        <View style={s.brand}>
          <View style={s.logo} />
          <View>
            <Text style={s.brandName}>MIRA</Text>
            <Text style={s.brandTag}>Ground Control Station</Text>
          </View>
        </View>

        <View style={s.tabs}>
          <View style={s.tabOn}>
            <Text style={s.tabOnTxt}>Missions</Text>
          </View>
          <TouchableOpacity
            style={s.tabBtn}
            onPress={() => nav.navigate('Fleet')}>
            <Text style={s.tabTxt}>Fleet</Text>
          </TouchableOpacity>
        </View>

        <View style={s.stripRight}>
          {connAdapterType === 'mock' && (
            <View style={s.demoPill}>
              <Text style={s.demoPillTxt}>DEMO</Text>
            </View>
          )}
          <TouchableOpacity
            style={s.gcsPill}
            onPress={() => nav.navigate('ConnectionSettings')}>
            <View style={[s.gcsDot, {backgroundColor: connDot}]} />
            <Text style={s.gcsLbl}>GCS LINK · {connLbl}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Text style={s.logoutTxt}>LOG OUT</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Overflow modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={overflowMission !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setOverflowMission(null)}>
        <View style={omSt.root}>
          <TouchableOpacity
            style={omSt.scrim}
            onPress={() => setOverflowMission(null)}
            activeOpacity={1}
          />
          <View style={omSt.sheet}>
            <View style={omSt.handle} />
            <Text style={omSt.missionName} numberOfLines={1}>
              {overflowMission?.name ?? ''}
            </Text>
            {OVERFLOW_ACTIONS.map(action => (
              <TouchableOpacity
                key={action.key}
                style={omSt.item}
                onPress={() => {
                  const m = overflowMission;
                  setOverflowMission(null);
                  if (m) {handleOverflowAction(action.key, m);}
                }}
                activeOpacity={0.75}>
                <Text style={[omSt.itemTxt, action.danger && omSt.itemTxtDanger]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ── Mission grid ───────────────────────────────────────────────────── */}
      <FlatList<Mission>
        data={shown}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={s.gridRow}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.cyan}
          />
        }
        renderItem={({item}) => (
          <View style={s.cell}>
            <MissionCard
              item={item}
              loading={loadingId === item.id}
              onPress={() => handleMissionPress(item)}
              onOverflow={() => setOverflowMission(item)}
            />
          </View>
        )}
        ListEmptyComponent={
          initialLoading ? (
            <View>
              <View style={s.gridRow}>
                <View style={s.cell}><SkeletonCard /></View>
                <View style={s.cell}><SkeletonCard /></View>
              </View>
              <View style={s.gridRow}>
                <View style={s.cell}><SkeletonCard /></View>
                <View style={s.cell}><SkeletonCard /></View>
              </View>
            </View>
          ) : (
            <EmptyPanel onNew={() => nav.navigate('MissionPlanner', {})} />
          )
        }
      />
    </View>
  );
}

// ── Main screen styles ────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: T.bg},

  // Top strip
  strip: {
    height: 72,
    backgroundColor: T.panel,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: T.hairline,
    gap: spacing.xl,
  },
  brand: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  logo: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: T.cyan,
    opacity: 0.9,
  },
  brandName: {fontSize: 13, fontWeight: '900', color: T.t1, letterSpacing: 0.05},
  brandTag: {fontSize: 9, color: T.t3, letterSpacing: 0.08},

  tabs: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1},
  tabOn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.chip,
    backgroundColor: `${T.cyan}22`,
    borderWidth: 1,
    borderColor: `${T.cyan}66`,
  },
  tabOnTxt: {fontSize: 12, fontWeight: '700', color: T.cyan, letterSpacing: 0.08},
  tabBtn: {paddingHorizontal: 10, paddingVertical: 5},
  tabTxt: {fontSize: 12, color: T.t2},

  stripRight: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  gcsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: T.hairline,
    backgroundColor: T.panelHi,
  },
  gcsDot: {width: 7, height: 7, borderRadius: 999},
  gcsLbl: {fontSize: 10, fontWeight: '700', color: T.t2, letterSpacing: 0.1},
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: T.hairline,
  },
  logoutTxt: {fontSize: 11, fontWeight: '600', color: T.t2},
  demoPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: `${T.amber}22`,
    borderWidth: 1,
    borderColor: `${T.amber}55`,
  },
  demoPillTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: T.amber,
    letterSpacing: 0.12,
    fontFamily: fontFamily.mono,
  },

  // Page header
  pageHdr: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  pageTitle: {fontSize: 22, fontWeight: '800', color: T.t1, letterSpacing: -0.3},
  pageSub: {fontSize: 13, color: T.t2, marginTop: 2},
  pageMeta: {fontSize: 11, color: T.t3, marginTop: 2},
  newBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.btn,
    backgroundColor: T.cyan,
  },
  newBtnTxt: {fontSize: 12, fontWeight: '700', color: T.bg, letterSpacing: 0.1},

  // KPI row
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  // Filter pills
  fpScroll: {marginBottom: spacing.md},
  fpRow: {paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: 4},
  fp: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: T.hairline,
    backgroundColor: T.panelHi,
  },
  fpOn: {borderColor: `${T.cyan}88`, backgroundColor: `${T.cyan}18`},
  fpTxt: {fontSize: 11, color: T.t2, fontWeight: '600'},
  fpTxtOn: {color: T.cyan},

  // Mission grid
  listContent: {paddingBottom: spacing.xl},
  gridRow: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cell: {flex: 1},
});

// ── Overflow modal styles ─────────────────────────────────────────────────────

const omSt = StyleSheet.create({
  root: {flex: 1, justifyContent: 'flex-end'},
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: T.panel,
    borderTopLeftRadius: radius.panel,
    borderTopRightRadius: radius.panel,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: T.hairline,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: T.hairline,
    borderRadius: radius.pill,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  missionName: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: T.t2,
    fontFamily: fontFamily.ui,
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: T.hairline,
  },
  item: {
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: T.hairline,
  },
  itemTxt: {
    fontSize: fontSize.body,
    color: T.t1,
    fontFamily: fontFamily.ui,
    fontWeight: '500',
  },
  itemTxtDanger: {color: T.red},
});
