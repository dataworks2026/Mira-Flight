/**
 * FleetScreen — dispatcher home base.
 * Grid of drone cards + alerts banner + today's missions sidebar.
 *
 * Drones: polled from /drones (404-safe, returns [] until backend delivers D-4).
 * Missions: polled from /missions every 15 s (endpoint exists).
 * Alerts: seeded locally; WS hook can be wired in once /ws/fleet/alerts is live.
 */

import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {miraClient} from '../api/miraClient';
import {Mission} from '../types/shared';
import {RootStackParamList} from '../App';
import {T, spacing, radius, fontSize, fontFamily, hairline} from '../theme/tokens';
import {StatusPill, KV} from '../components';

// ─── Fleet-local types ────────────────────────────────────────────────────────

type DroneStatus =
  | 'preflight'
  | 'flying'
  | 'returning'
  | 'idle'
  | 'charging'
  | 'offline'
  | 'maintenance';

type DroneModel = 'M350' | 'M300' | 'M30T' | 'Mavic 3T' | 'Anafi';

interface FleetDrone {
  id: string;
  name: string;
  serial: string;
  model: DroneModel;
  fwVersion: string;
  bay: string;
  status: DroneStatus;
  batt: number | null;
  battTemp: number | null;
  link: number | null;
  sats: number | null;
  rtk: 'FIX' | 'FLOAT' | 'NONE' | null;
  mission: string | null;
  operator: string | null;
  altitude?: number;
  speed?: number;
  distFromHome?: number;
  flightTime?: string;
  eta?: string;
  chargingFinish?: string;
  lastSeen?: string;
  cycles: number;
}

type AlertTone = 'red' | 'amber';

interface FleetAlert {
  id: string;
  tone: AlertTone;
  icon: string;
  text: string;
  actionLabel: string;
}

type DroneFilter = DroneStatus | 'all';

// ─── Status color map ─────────────────────────────────────────────────────────

const STATUS_COLOR: Record<DroneStatus, string> = {
  preflight:   T.cyan,
  flying:      T.green,
  returning:   T.blue,
  idle:        T.t2,
  charging:    T.amber,
  offline:     T.red,
  maintenance: T.purple,
};

const STATUS_LABEL: Record<DroneStatus, string> = {
  preflight:   'PREFLIGHT',
  flying:      'FLYING',
  returning:   'RETURNING',
  idle:        'IDLE',
  charging:    'CHARGING',
  offline:     'OFFLINE',
  maintenance: 'MAINTENANCE',
};

// ─── useDrones hook — 404-safe ────────────────────────────────────────────────

function useDrones(pollMs = 5000): FleetDrone[] {
  const [drones, setDrones] = useState<FleetDrone[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    try {
      // getDrones does not exist yet (backend D-4). Cast to unknown so we can
      // optional-chain without polluting the rest of the file with `any`.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = miraClient as Record<string, unknown>;
      const getDrones = client['getDrones'];
      if (typeof getDrones === 'function') {
        const raw: unknown = await getDrones();
        if (Array.isArray(raw)) {
          setDrones(raw as FleetDrone[]);
        }
      }
    } catch {
      // /drones not yet deployed — stay empty, screen still renders
    }
  }, []);

  useEffect(() => {
    fetch();
    timerRef.current = setInterval(fetch, pollMs);
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, [fetch, pollMs]);

  return drones;
}

// ─── useMissions hook ─────────────────────────────────────────────────────────

function useMissions(pollMs = 15000): Mission[] {
  const [missions, setMissions] = useState<Mission[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    try {
      const data = await miraClient.getMissions();
      setMissions(data);
    } catch {
      // keep stale data
    }
  }, []);

  useEffect(() => {
    fetch();
    timerRef.current = setInterval(fetch, pollMs);
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, [fetch, pollMs]);

  return missions;
}

// ─── Seed alerts (WS to replace once /ws/fleet/alerts is live) ───────────────

const SEED_ALERTS: FleetAlert[] = [
  {
    id: 'a1',
    tone: 'red',
    icon: '!',
    text: 'M30T-D offline since 14:22 — 1h 6m no telemetry',
    actionLabel: 'Investigate',
  },
  {
    id: 'a2',
    tone: 'amber',
    icon: '~',
    text: '2 TB65 batteries due for 200-cycle service (Drone A · Drone C)',
    actionLabel: 'View batteries',
  },
  {
    id: 'a3',
    tone: 'amber',
    icon: 'W',
    text: 'Wind forecast 7 m/s gusting 9 m/s at 16:30 — review pending missions',
    actionLabel: 'Forecast',
  },
];

// ─── DroneCard ────────────────────────────────────────────────────────────────

interface DroneCardProps {
  drone: FleetDrone;
  onCTA: (drone: FleetDrone) => void;
}

function battColor(pct: number | null): string {
  if (pct === null) {
    return T.t3;
  }
  if (pct >= 30) {
    return T.green;
  }
  if (pct >= 20) {
    return T.amber;
  }
  return T.red;
}

function ctaLabel(status: DroneStatus): string {
  switch (status) {
    case 'idle':        return 'DISPATCH';
    case 'preflight':   return 'PREFLIGHT';
    case 'flying':
    case 'returning':   return 'VIEW HUD';
    case 'charging':    return 'BATTERY';
    case 'offline':     return 'INVESTIGATE';
    case 'maintenance': return 'DETAILS';
  }
}

const DroneCard = memo(function DroneCard({drone, onCTA}: DroneCardProps) {
  const statusColor = STATUS_COLOR[drone.status];
  const isOffline = drone.status === 'offline';

  // Status-specific in-flight strip content
  const renderStatusStrip = () => {
    switch (drone.status) {
      case 'flying':
        return (
          <View style={cs.statusStrip}>
            <StatChip label="ALT" value={drone.altitude != null ? `${drone.altitude}m` : '--'} />
            <StatChip label="SPD" value={drone.speed != null ? `${drone.speed}m/s` : '--'} />
            <StatChip label="DST" value={drone.distFromHome != null ? `${drone.distFromHome}m` : '--'} />
            <StatChip label="T+" value={drone.flightTime ?? '--'} />
          </View>
        );
      case 'returning':
        return (
          <View style={cs.statusStrip}>
            <StatChip label="ALT" value={drone.altitude != null ? `${drone.altitude}m` : '--'} />
            <StatChip label="DST" value={drone.distFromHome != null ? `${drone.distFromHome}m` : '--'} />
            <StatChip label="ETA" value={drone.eta ?? '--'} />
          </View>
        );
      case 'charging':
        return (
          <View style={cs.statusStrip}>
            <StatChip label="BATT" value={drone.batt != null ? `${drone.batt}%` : '--'} />
            <StatChip label="DONE" value={drone.chargingFinish ?? '--'} />
            <StatChip label="TEMP" value={drone.battTemp != null ? `${drone.battTemp}°C` : '--'} />
          </View>
        );
      case 'offline':
        return (
          <View style={[cs.statusStrip, {justifyContent: 'center'}]}>
            <Text style={[cs.offlineText]}>NO TELEMETRY · {drone.lastSeen ?? 'last seen unknown'}</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[cs.card, {borderTopColor: statusColor, borderTopWidth: 3}]}>
      {/* Header */}
      <View style={cs.cardHeader}>
        <Text style={[cs.droneId, {color: statusColor}]}>{drone.id}</Text>
        <View style={[cs.statusBadge, {backgroundColor: statusColor + '22', borderColor: statusColor}]}>
          <Text style={[cs.statusBadgeText, {color: statusColor}]}>{STATUS_LABEL[drone.status]}</Text>
        </View>
      </View>
      <Text style={cs.droneName}>{drone.name}</Text>
      <Text style={cs.droneSub}>{drone.model} · {drone.bay}</Text>

      {/* Status strip */}
      {renderStatusStrip()}

      {/* 4-up stats */}
      <View style={cs.statsRow}>
        <StatBox label="BATT" value={drone.batt != null ? `${drone.batt}%` : '—'} color={battColor(drone.batt)} />
        <StatBox label="LINK" value={drone.link != null ? `${drone.link}%` : '—'} color={drone.link != null && drone.link >= 70 ? T.green : T.amber} />
        <StatBox label="GPS" value={drone.sats != null ? `${drone.sats}` : '—'} color={drone.sats != null && drone.sats >= 12 ? T.green : drone.sats != null ? T.amber : T.t3} />
        <StatBox label="RTK" value={drone.rtk ?? '—'} color={drone.rtk === 'FIX' ? T.green : drone.rtk === 'FLOAT' ? T.amber : T.t3} />
      </View>

      {/* Mission strip */}
      <View style={cs.missionStrip}>
        {drone.mission ? (
          <Text style={cs.missionText} numberOfLines={1}>{drone.mission}</Text>
        ) : (
          <Text style={cs.missionEmpty}>No mission assigned</Text>
        )}
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[cs.ctaBtn, {borderColor: statusColor, backgroundColor: isOffline ? T.red + '22' : statusColor + '18'}]}
        onPress={() => onCTA(drone)}
        accessibilityRole="button"
        accessibilityLabel={`${ctaLabel(drone.status)} ${drone.id}`}>
        <Text style={[cs.ctaText, {color: statusColor}]}>{ctaLabel(drone.status)}</Text>
      </TouchableOpacity>
    </View>
  );
});

// ─── Tiny sub-components inside DroneCard ────────────────────────────────────

function StatChip({label, value}: {label: string; value: string}) {
  return (
    <View style={cs.statChip}>
      <Text style={cs.statChipLabel}>{label}</Text>
      <Text style={cs.statChipValue}>{value}</Text>
    </View>
  );
}

function StatBox({label, value, color}: {label: string; value: string; color: string}) {
  return (
    <View style={cs.statBox}>
      <Text style={cs.statBoxLabel}>{label}</Text>
      <Text style={[cs.statBoxValue, {color}]}>{value}</Text>
    </View>
  );
}

// ─── AlertBanner ─────────────────────────────────────────────────────────────

interface AlertBannerProps {
  alerts: FleetAlert[];
  dismissed: Set<string>;
  onDismiss: (id: string) => void;
  onShowMore: () => void;
}

function AlertBanner({alerts, dismissed, onDismiss, onShowMore}: AlertBannerProps) {
  const visible = alerts.filter(a => !dismissed.has(a.id));
  const shown = visible.slice(0, 3);
  const overflow = visible.length - 3;

  if (visible.length === 0) {
    return null;
  }

  return (
    <View style={ab.banner}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ab.scroll}>
        {shown.map(alert => (
          <View
            key={alert.id}
            style={[ab.chip, {borderColor: alert.tone === 'red' ? T.red : T.amber}]}>
            <Text style={[ab.icon, {color: alert.tone === 'red' ? T.red : T.amber}]}>
              {alert.icon}
            </Text>
            <Text style={ab.text} numberOfLines={1}>{alert.text}</Text>
            <TouchableOpacity
              style={[ab.action, {borderColor: alert.tone === 'red' ? T.red : T.amber}]}
              onPress={() => onDismiss(alert.id)}
              accessibilityRole="button"
              accessibilityLabel={alert.actionLabel}>
              <Text style={[ab.actionText, {color: alert.tone === 'red' ? T.red : T.amber}]}>
                {alert.actionLabel}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
        {overflow > 0 && (
          <TouchableOpacity style={ab.overflowChip} onPress={onShowMore} accessibilityRole="button">
            <Text style={ab.overflowText}>+{overflow} more</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ─── MissionsSidebar ─────────────────────────────────────────────────────────

interface MissionsSidebarProps {
  missions: Mission[];
  onMissionPress: (m: Mission) => void;
}

type SectionKey = 'in_flight' | 'scheduled' | 'completed' | 'aborted';

const SECTION_CONFIG: Record<SectionKey, {label: string; color: string; statusMatch: string[]}> = {
  in_flight:  {label: 'IN FLIGHT NOW',   color: T.green,  statusMatch: ['in_progress', 'in_flight']},
  scheduled:  {label: 'SCHEDULED NEXT',  color: T.cyan,   statusMatch: ['planned', 'scheduled', 'created']},
  completed:  {label: 'COMPLETE TODAY',  color: T.t2,     statusMatch: ['completed', 'complete']},
  aborted:    {label: 'CANCELLED',       color: T.red,    statusMatch: ['aborted', 'cancelled']},
};

function MissionsSidebar({missions, onMissionPress}: MissionsSidebarProps) {
  const [collapsed, setCollapsed] = useState<Set<SectionKey>>(new Set());

  const toggle = (key: SectionKey) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const inFlight   = missions.filter(m => SECTION_CONFIG.in_flight.statusMatch.includes(m.status));
  const scheduled  = missions.filter(m => SECTION_CONFIG.scheduled.statusMatch.includes(m.status));
  const completed  = missions.filter(m => SECTION_CONFIG.completed.statusMatch.includes(m.status));
  const aborted    = missions.filter(m => SECTION_CONFIG.aborted.statusMatch.includes(m.status));

  const grouped: Record<SectionKey, Mission[]> = {
    in_flight: inFlight,
    scheduled,
    completed,
    aborted,
  };

  // KPIs
  const totalPhotos = missions.reduce((s, m) => s + (m.total_photos ?? 0), 0);
  const dataMb = missions.reduce((s, m) => s + (m.photos_uploaded ?? 0) * 6, 0); // rough estimate
  const qaQueue = missions.reduce((s, m) => s + (m.photos_uploaded - m.photos_analyzed), 0);

  return (
    <View style={sb.container}>
      {/* Header */}
      <View style={sb.header}>
        <Text style={sb.headerLabel}>TODAY · MISSIONS</Text>
        <Text style={sb.missionCount}>{missions.length} missions</Text>
      </View>

      {/* KPI strip */}
      <View style={sb.kpiRow}>
        <KpiTile label="IN FLIGHT" value={String(inFlight.length)} />
        <KpiTile label="PHOTOS" value={String(totalPhotos)} />
        <KpiTile label="DATA" value={`${dataMb}MB`} />
        <KpiTile label="QA QUEUE" value={String(Math.max(qaQueue, 0))} />
      </View>

      <ScrollView style={sb.scroll} showsVerticalScrollIndicator={false}>
        {(Object.entries(grouped) as [SectionKey, Mission[]][]).map(([key, items]) => {
          const cfg = SECTION_CONFIG[key];
          const isCollapsed = collapsed.has(key);
          return (
            <View key={key} style={sb.section}>
              <TouchableOpacity
                style={[sb.sectionHeader, {borderLeftColor: cfg.color}]}
                onPress={() => toggle(key)}
                accessibilityRole="button"
                accessibilityLabel={`${cfg.label} section, ${items.length} missions`}>
                <Text style={[sb.sectionLabel, {color: cfg.color}]}>{cfg.label}</Text>
                <Text style={sb.sectionCount}>{items.length}</Text>
                <Text style={sb.chevron}>{isCollapsed ? '▸' : '▾'}</Text>
              </TouchableOpacity>

              {!isCollapsed && items.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    sb.missionRow,
                    key === 'in_flight' && sb.missionRowInFlight,
                    key === 'aborted' && sb.missionRowAborted,
                  ]}
                  onPress={() => onMissionPress(m)}
                  accessibilityRole="button"
                  accessibilityLabel={`Mission ${m.name}`}>
                  <View style={sb.missionMain}>
                    <Text style={sb.missionName} numberOfLines={1}>{m.name}</Text>
                    <Text style={sb.missionMeta}>{m.asset_id}</Text>
                  </View>
                  <View style={[sb.missionStatusChip, {backgroundColor: cfg.color + '22'}]}>
                    <Text style={[sb.missionStatusText, {color: cfg.color}]}>{m.status.toUpperCase()}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {!isCollapsed && items.length === 0 && (
                <Text style={sb.emptySection}>None</Text>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={sb.footer}>
        <Text style={sb.footerText}>Tomorrow: check calendar</Text>
      </View>
    </View>
  );
}

function KpiTile({label, value}: {label: string; value: string}) {
  return (
    <View style={sb.kpiTile}>
      <Text style={sb.kpiValue}>{value}</Text>
      <Text style={sb.kpiLabel}>{label}</Text>
    </View>
  );
}

// ─── FleetScreen ─────────────────────────────────────────────────────────────

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const FILTER_TABS: {key: DroneFilter; label: string}[] = [
  {key: 'all',         label: 'All'},
  {key: 'flying',      label: 'Flying'},
  {key: 'idle',        label: 'Idle'},
  {key: 'offline',     label: 'Offline'},
];

export default function FleetScreen() {
  const navigation = useNavigation<NavProp>();
  const drones = useDrones(5000);
  const missions = useMissions(15000);

  const [filter, setFilter] = useState<DroneFilter>('all');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const dismissAlert = useCallback((id: string) => {
    setDismissed(prev => new Set([...prev, id]));
  }, []);

  const filteredDrones = filter === 'all'
    ? drones
    : drones.filter(d => d.status === filter);

  // Counts for filter chips
  const counts: Partial<Record<DroneFilter, number>> = {
    all:     drones.length,
    flying:  drones.filter(d => d.status === 'flying').length,
    idle:    drones.filter(d => d.status === 'idle').length,
    offline: drones.filter(d => d.status === 'offline').length,
  };

  const handleDroneCTA = useCallback((drone: FleetDrone) => {
    switch (drone.status) {
      case 'flying':
      case 'returning':
        if (drone.mission) {
          // Find matching mission to get id for HUD navigation
          const match = missions.find(m => m.name.includes(drone.mission ?? '') || (drone.mission ?? '').includes(m.id));
          if (match) {
            navigation.navigate('Hud', {missionId: match.id});
          }
        }
        break;
      case 'idle':
        navigation.navigate('MissionPlanner', {});
        break;
      default:
        break;
    }
  }, [missions, navigation]);

  const handleMissionPress = useCallback(async (m: Mission) => {
    if (m.status === 'completed' || m.status === 'aborted') {
      navigation.navigate('MissionReview', {missionId: m.id});
    } else if (m.status === 'in_progress' || m.status === 'in_flight') {
      navigation.navigate('Hud', {missionId: m.id});
    } else {
      navigation.navigate('Preflight', {missionId: m.id});
    }
  }, [navigation]);

  const renderDroneCard = useCallback(({item}: {item: FleetDrone}) => (
    <DroneCard drone={item} onCTA={handleDroneCTA} />
  ), [handleDroneCTA]);

  const droneKeyExtractor = useCallback((item: FleetDrone) => item.id, []);

  return (
    <View style={s.root}>
      {/* Top strip */}
      <View style={s.topStrip}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={s.topLeft}>
          <Text style={s.logoText}>MIRA</Text>
          <Text style={s.screenTitle}>FLEET</Text>
        </View>

        <View style={s.tabRow}>
          {FILTER_TABS.map(tab => {
            const active = filter === tab.key;
            const color = active ? T.cyan : T.t2;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[s.tab, active && s.tabActive]}
                onPress={() => setFilter(tab.key)}
                accessibilityRole="tab"
                accessibilityState={{selected: active}}>
                <Text style={[s.tabText, {color}]}>{tab.label}</Text>
                {counts[tab.key] !== undefined && (
                  <View style={[s.tabBadge, {backgroundColor: active ? T.cyan + '33' : T.panelHi}]}>
                    <Text style={[s.tabBadgeText, {color}]}>{counts[tab.key]}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.topRight}>
          <StatusPill tone="cyan" icon="M" label="FLEET" size="sm" />
        </View>
      </View>

      {/* Alerts banner */}
      <AlertBanner
        alerts={SEED_ALERTS}
        dismissed={dismissed}
        onDismiss={dismissAlert}
        onShowMore={() => setShowAllAlerts(!showAllAlerts)}
      />

      {/* Body */}
      <View style={s.body}>
        {/* Left: drone grid */}
        <View style={s.gridSection}>
          <View style={s.gridHeader}>
            <Text style={s.gridTitle}>
              {drones.length > 0
                ? `${drones.length} drones · ${counts.flying ?? 0} airborne`
                : 'Fleet — no drones connected'}
            </Text>
          </View>

          {drones.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyStateIcon}>◎</Text>
              <Text style={s.emptyStateTitle}>No drone data</Text>
              <Text style={s.emptyStateSub}>
                The /drones endpoint is not yet available.{'\n'}
                Drone cards will appear automatically when the backend is ready.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredDrones}
              renderItem={renderDroneCard}
              keyExtractor={droneKeyExtractor}
              numColumns={3}
              columnWrapperStyle={s.gridRow}
              contentContainerStyle={s.gridContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Right: missions sidebar */}
        <MissionsSidebar missions={missions} onMissionPress={handleMissionPress} />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const SIDEBAR_W = 320;

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },
  // Top strip
  topStrip: {
    height: 64,
    backgroundColor: T.panel,
    borderBottomWidth: hairline,
    borderBottomColor: T.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 22,
    color: T.cyan,
    fontFamily: fontFamily.ui,
    lineHeight: 26,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoText: {
    fontFamily: fontFamily.mono,
    fontSize: 14,
    fontWeight: '700',
    color: T.cyan,
    letterSpacing: 2,
  },
  screenTitle: {
    fontFamily: fontFamily.ui,
    fontSize: 14,
    fontWeight: '700',
    color: T.t1,
    letterSpacing: 1.5,
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    minHeight: 44,
  },
  tabActive: {
    backgroundColor: T.cyan + '18',
    borderWidth: hairline,
    borderColor: T.cyan + '44',
  },
  tabText: {
    fontFamily: fontFamily.ui,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  tabBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabBadgeText: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    fontWeight: '700',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Body
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  // Grid
  gridSection: {
    flex: 1,
    borderRightWidth: hairline,
    borderRightColor: T.hairline,
  },
  gridHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: hairline,
    borderBottomColor: T.hairline2,
  },
  gridTitle: {
    fontFamily: fontFamily.ui,
    fontSize: fontSize.body,
    color: T.t2,
    fontWeight: '600',
  },
  gridRow: {
    gap: spacing.md,
  },
  gridContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyStateIcon: {
    fontSize: 40,
    color: T.t3,
    marginBottom: spacing.md,
  },
  emptyStateTitle: {
    fontFamily: fontFamily.ui,
    fontSize: fontSize.cardTitle,
    color: T.t2,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  emptyStateSub: {
    fontFamily: fontFamily.ui,
    fontSize: fontSize.body,
    color: T.t3,
    textAlign: 'center',
    lineHeight: 20,
  },
});

// DroneCard styles
const cs = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: T.card,
    borderRadius: radius.card,
    padding: spacing.md,
    minWidth: 200,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  droneId: {
    fontFamily: fontFamily.mono,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: hairline,
  },
  statusBadgeText: {
    fontFamily: fontFamily.mono,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  droneName: {
    fontFamily: fontFamily.ui,
    fontSize: 13,
    fontWeight: '600',
    color: T.t1,
  },
  droneSub: {
    fontFamily: fontFamily.ui,
    fontSize: 11,
    color: T.t3,
  },
  statusStrip: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: T.panelHi,
    borderRadius: radius.chip,
    padding: spacing.xs,
    flexWrap: 'wrap',
  },
  offlineText: {
    fontFamily: fontFamily.mono,
    fontSize: 9,
    color: T.red,
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  statBox: {
    flex: 1,
    backgroundColor: T.panelHi,
    borderRadius: radius.chip,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  statBoxLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 8,
    color: T.t3,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statBoxValue: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statChip: {
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  statChipLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 8,
    color: T.t3,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statChipValue: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: T.t1,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  missionStrip: {
    backgroundColor: T.panelHi,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 28,
    justifyContent: 'center',
  },
  missionText: {
    fontFamily: fontFamily.ui,
    fontSize: 11,
    color: T.t2,
    fontWeight: '500',
  },
  missionEmpty: {
    fontFamily: fontFamily.ui,
    fontSize: 11,
    color: T.t3,
    fontStyle: 'italic',
  },
  ctaBtn: {
    borderRadius: radius.btn,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  ctaText: {
    fontFamily: fontFamily.ui,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

// AlertBanner styles
const ab = StyleSheet.create({
  banner: {
    backgroundColor: T.panel,
    borderBottomWidth: hairline,
    borderBottomColor: T.hairline,
    minHeight: 52,
    justifyContent: 'center',
  },
  scroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: hairline,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: T.card,
    gap: spacing.sm,
    maxWidth: 360,
  },
  icon: {
    fontFamily: fontFamily.mono,
    fontSize: 13,
    fontWeight: '700',
  },
  text: {
    flex: 1,
    fontFamily: fontFamily.ui,
    fontSize: 12,
    color: T.t1,
  },
  action: {
    borderWidth: hairline,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 28,
    justifyContent: 'center',
  },
  actionText: {
    fontFamily: fontFamily.ui,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  overflowChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: T.cardHi,
    borderRadius: radius.chip,
    minHeight: 44,
    justifyContent: 'center',
  },
  overflowText: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    color: T.t2,
    fontWeight: '700',
  },
});

// Sidebar styles
const sb = StyleSheet.create({
  container: {
    width: SIDEBAR_W,
    backgroundColor: T.panel,
    borderLeftWidth: hairline,
    borderLeftColor: T.hairline,
    flexDirection: 'column',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: hairline,
    borderBottomColor: T.hairline2,
  },
  headerLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    fontWeight: '700',
    color: T.t3,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  missionCount: {
    fontFamily: fontFamily.ui,
    fontSize: fontSize.cardTitle,
    fontWeight: '700',
    color: T.t1,
    marginTop: spacing.xs,
  },
  kpiRow: {
    flexDirection: 'row',
    borderBottomWidth: hairline,
    borderBottomColor: T.hairline2,
  },
  kpiTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRightWidth: hairline,
    borderRightColor: T.hairline2,
  },
  kpiValue: {
    fontFamily: fontFamily.mono,
    fontSize: 18,
    fontWeight: '700',
    color: T.t1,
    fontVariant: ['tabular-nums'],
  },
  kpiLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 8,
    fontWeight: '700',
    color: T.t3,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  section: {
    borderBottomWidth: hairline,
    borderBottomColor: T.hairline2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderLeftWidth: 3,
    gap: spacing.sm,
    minHeight: 44,
  },
  sectionLabel: {
    flex: 1,
    fontFamily: fontFamily.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionCount: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    color: T.t3,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  chevron: {
    fontSize: 10,
    color: T.t3,
  },
  missionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: hairline,
    borderTopColor: T.hairline2,
    gap: spacing.sm,
    minHeight: 56,
  },
  missionRowInFlight: {
    borderLeftWidth: 3,
    borderLeftColor: T.green,
  },
  missionRowAborted: {
    backgroundColor: T.red + '0A',
  },
  missionMain: {
    flex: 1,
  },
  missionName: {
    fontFamily: fontFamily.ui,
    fontSize: 13,
    color: T.t1,
    fontWeight: '600',
  },
  missionMeta: {
    fontFamily: fontFamily.ui,
    fontSize: 11,
    color: T.t3,
    marginTop: 2,
  },
  missionStatusChip: {
    borderRadius: radius.chip,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  missionStatusText: {
    fontFamily: fontFamily.mono,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptySection: {
    fontFamily: fontFamily.ui,
    fontSize: 12,
    color: T.t3,
    fontStyle: 'italic',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  footer: {
    borderTopWidth: hairline,
    borderTopColor: T.hairline2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  footerText: {
    fontFamily: fontFamily.ui,
    fontSize: 12,
    color: T.t3,
  },
});
