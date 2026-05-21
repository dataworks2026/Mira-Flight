import React, {useState, useMemo, useCallback} from 'react';
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
import {useDroneStore} from '../store/droneStore';
import {RootStackParamList} from '../App';
import {
  StatusPill,
  KV,
  BreadcrumbStep,
  BreadcrumbConnector,
  FlightCtrlBtn,
} from '../components';
import {T, spacing, radius, fontSize, hairline, hitTarget} from '../theme/tokens';

// ── Local types ──────────────────────────────────────────────────────────────

type CheckStatus = 'ok' | 'warn' | 'block';

interface CheckItem {
  id: string;
  group: GroupId;
  label: string;
  detail: string;
  status: CheckStatus;
  value: string;
  warning?: string;
  blocker?: string;
}

type GroupId =
  | 'hardware'
  | 'sensors'
  | 'connectivity'
  | 'environment'
  | 'airspace'
  | 'operator';

interface CheckGroup {
  id: GroupId;
  label: string;
}

// ── Static check groups ───────────────────────────────────────────────────────

const GROUPS: CheckGroup[] = [
  {id: 'hardware', label: 'Hardware'},
  {id: 'sensors', label: 'Sensors'},
  {id: 'connectivity', label: 'Connectivity'},
  {id: 'environment', label: 'Environment'},
  {id: 'airspace', label: 'Airspace & Mission'},
  {id: 'operator', label: 'Operator'},
];

// ── Static (non-live) check definitions ──────────────────────────────────────
// Live checks (GPS, RC link, battery) are injected at render via useDroneStore.

const STATIC_CHECKS: Omit<CheckItem, 'status' | 'value'>[] = [
  // Hardware
  {id: 'props',     group: 'hardware',     label: 'Propellers clear',      detail: '4 of 4 secured, no chips, CW/CCW correct'},
  {id: 'gimbal',    group: 'hardware',     label: 'Gimbal lock off',       detail: 'Lock pin removed, gimbal moves freely'},
  {id: 'sd_card',   group: 'hardware',     label: 'SD card present',       detail: 'Card detected, error count 0'},
  {id: 'payload',   group: 'hardware',     label: 'Payload mounted',       detail: 'H20T secured + locked on mount'},
  // Sensors
  {id: 'imu',       group: 'sensors',      label: 'IMU calibrated',        detail: 'Drift < 1 deg, last cal < 30 days'},
  {id: 'compass',   group: 'sensors',      label: 'Compass calibrated',    detail: 'Interference-free environment confirmed'},
  // gps injected live
  {id: 'imu_temp',  group: 'sensors',      label: 'IMU temperature',       detail: 'Within -20 to 40 C operating range'},
  // Connectivity
  // rc_link injected live
  {id: 'cloud',     group: 'connectivity', label: 'Cloud sync OK',         detail: 'Latency < 200 ms, outbound queue clear'},
  {id: 'cell_4g',   group: 'connectivity', label: '4G failover ready',     detail: 'Carrier active, signal bars > 2'},
  // Environment
  {id: 'wind',      group: 'environment',  label: 'Wind acceptable',       detail: 'Steady < 8 m/s, gusts < 12 m/s'},
  {id: 'visibility',group: 'environment',  label: 'Visibility > 3 nm',     detail: 'VFR conditions, ceiling > 1000 ft'},
  {id: 'temp_env',  group: 'environment',  label: 'Temp in range',         detail: 'Ambient 0–40 C, no precipitation'},
  // Airspace
  {id: 'laanc',     group: 'airspace',     label: 'LAANC authorization',   detail: 'Authorization granted for this airspace'},
  {id: 'geofence',  group: 'airspace',     label: 'Geofence armed',        detail: 'Mission boundary loaded and active'},
  {id: 'rth_alt',   group: 'airspace',     label: 'RTH altitude set',      detail: 'Return-to-home altitude clears obstacles'},
  // mission_plan injected via waypoints count
  // Operator
  {id: 'license',   group: 'operator',     label: 'Pilot license active',  detail: 'Part 107 certificate valid, not expired'},
  {id: 'flight_log',group: 'operator',     label: 'Flight log open',       detail: 'Auto-entry created with this mission ID'},
  {id: 'spotter',   group: 'operator',     label: 'VLOS spotter',          detail: 'Required for orbit > 50 m AGL'},
];

// Default static statuses for non-live items (mock / placeholder values)
const STATIC_STATUS: Record<string, {status: CheckStatus; value: string; warning?: string; blocker?: string}> = {
  props:       {status: 'ok',   value: '4 / 4'},
  gimbal:      {status: 'ok',   value: 'READY'},
  sd_card:     {status: 'ok',   value: '28.4 GB free'},
  payload:     {status: 'ok',   value: 'LOCKED'},
  imu:         {status: 'ok',   value: 'CALIBRATED'},
  compass:     {status: 'ok',   value: 'CALIBRATED'},
  imu_temp:    {status: 'ok',   value: '22 C'},
  cloud:       {status: 'warn', value: '340 ms', warning: 'Cloud latency elevated. Telemetry relay may lag.'},
  cell_4g:     {status: 'ok',   value: 'LTE 4 bars'},
  wind:        {status: 'warn', value: '9.2 m/s', warning: 'Wind exceeds 8 m/s steady. Assess gust conditions before arming.'},
  visibility:  {status: 'ok',   value: '6.2 nm'},
  temp_env:    {status: 'ok',   value: '18 C'},
  laanc:       {status: 'ok',   value: 'AUTH #LA-2024-0417'},
  geofence:    {status: 'ok',   value: 'ARMED'},
  rth_alt:     {status: 'ok',   value: '60 m AGL'},
  license:     {status: 'ok',   value: 'Part 107 valid'},
  flight_log:  {status: 'ok',   value: 'LOG OPEN'},
  spotter:     {status: 'warn', value: 'UNASSIGNED', warning: 'No spotter assigned. Pilot must maintain direct VLOS at all times.'},
};

// ── Status helpers ────────────────────────────────────────────────────────────

function statusToTone(s: CheckStatus): 'green' | 'amber' | 'red' {
  if (s === 'ok')    return 'green';
  if (s === 'warn')  return 'amber';
  return 'red';
}

function statusIcon(s: CheckStatus): string {
  if (s === 'ok')   return '✓';
  if (s === 'warn') return '⚠';
  return '✕';
}

function worstStatus(items: CheckItem[]): CheckStatus {
  if (items.some(i => i.status === 'block')) return 'block';
  if (items.some(i => i.status === 'warn'))  return 'warn';
  return 'ok';
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface CheckItemRowProps {
  item: CheckItem;
}

function CheckItemRow({item}: CheckItemRowProps): React.ReactElement {
  const tone = statusToTone(item.status);
  const rowBg =
    item.status === 'warn'  ? T.amber + '0A' :
    item.status === 'block' ? T.red   + '0A' :
    'transparent';

  return (
    <View style={[styles.checkRow, {backgroundColor: rowBg}]}>
      <StatusPill
        tone={tone}
        icon={statusIcon(item.status)}
        label={tone === 'green' ? 'OK' : tone === 'amber' ? 'WARN' : 'BLOCK'}
        size="sm"
        style={styles.checkPill}
      />
      <View style={styles.checkText}>
        <Text style={styles.checkLabel}>{item.label}</Text>
        <Text style={styles.checkDetail}>{item.detail}</Text>
        {item.status === 'warn' && item.warning !== undefined && (
          <Text style={styles.checkWarn}>{item.warning}</Text>
        )}
        {item.status === 'block' && item.blocker !== undefined && (
          <Text style={styles.checkBlocker}>{item.blocker}</Text>
        )}
      </View>
      <Text style={[styles.checkValue, {color: tone === 'green' ? T.green : tone === 'amber' ? T.amber : T.red}]}>
        {item.value}
      </Text>
    </View>
  );
}

interface SectionCardProps {
  group: CheckGroup;
  items: CheckItem[];
}

function SectionCard({group, items}: SectionCardProps): React.ReactElement {
  const worst = worstStatus(items);
  const tone = statusToTone(worst);

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{group.label.toUpperCase()}</Text>
        <StatusPill
          tone={tone}
          icon={statusIcon(worst)}
          label={worst === 'ok' ? 'OK' : worst === 'warn' ? 'WARN' : 'BLOCK'}
          size="sm"
        />
      </View>
      {items.map((item, idx) => (
        <View key={item.id}>
          <CheckItemRow item={item} />
          {idx < items.length - 1 && <View style={styles.rowDivider} />}
        </View>
      ))}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function PreflightScreen(): React.ReactElement {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<any>();
  const missionId: string = (route.params?.missionId as string) ?? '';

  const {width, height} = useWindowDimensions();
  const isLandscape = width > height;

  // Store reads
  const mission       = useMissionStore(s => s.currentMission);
  const waypoints     = useMissionStore(s => s.waypoints);
  const battery       = useDroneStore(s => s.battery);
  const batteryV      = useDroneStore(s => s.battery_voltage);
  const batteryTemp   = useDroneStore(s => s.battery_temp_c);
  const satellites    = useDroneStore(s => s.satellites);
  const signal        = useDroneStore(s => s.signal);
  const rtkStatus     = useDroneStore(s => s.rtk_status);
  const connected     = useDroneStore(s => s.connected);

  // Attestation toggles
  const [vlos,             setVlos]             = useState(false);
  const [airspaceCleared,  setAirspaceCleared]  = useState(false);
  const [warningsAccepted, setWarningsAccepted] = useState(false);

  // Build full check list, injecting live values for GPS, RC link, battery
  const checks: CheckItem[] = useMemo(() => {
    // Live: GPS lock
    const gpsStatus: CheckStatus =
      satellites >= 12 ? 'ok' :
      satellites >= 8  ? 'warn' :
      'block';
    const gpsItem: CheckItem = {
      id: 'gps', group: 'sensors', label: 'GPS lock', detail: 'Multi-constellation HDOP + satellite count',
      status: gpsStatus,
      value: `${satellites} sats`,
      warning:  gpsStatus === 'warn'  ? `Only ${satellites} satellites. HDOP may be elevated.` : undefined,
      blocker:  gpsStatus === 'block' ? `GPS lock insufficient (${satellites} sats). Minimum 8 required.` : undefined,
    };

    // Live: RC link
    const rcStatus: CheckStatus =
      !connected        ? 'block' :
      signal >= -70     ? 'ok'    :
      signal >= -85     ? 'warn'  :
      'block';
    const rcItem: CheckItem = {
      id: 'rc_link', group: 'connectivity', label: 'RC link active', detail: 'Bind status + signal strength',
      status: rcStatus,
      value: connected ? `${signal} dBm` : 'NO LINK',
      warning:  rcStatus === 'warn'  ? `RC signal weak (${signal} dBm). Maintain close proximity.` : undefined,
      blocker:  rcStatus === 'block' ? 'RC link not established. Bind controller before arming.' : undefined,
    };

    // Live: Battery
    const batStatus: CheckStatus =
      battery >= 30 ? 'ok' :
      battery >= 20 ? 'warn' :
      'block';
    const batItem: CheckItem = {
      id: 'battery', group: 'hardware', label: 'Storage battery OK', detail: 'TB65 charge, voltage and temperature',
      status: batStatus,
      value: `${battery}%`,
      warning:  batStatus === 'warn'  ? `Battery at ${battery}%. Plan abbreviated mission.` : undefined,
      blocker:  batStatus === 'block' ? `Battery critically low (${battery}%). Charge or swap before arming.` : undefined,
    };

    // Mission plan: waypoints
    const wpStatus: CheckStatus = waypoints.length > 0 ? 'ok' : 'block';
    const wpItem: CheckItem = {
      id: 'mission_plan', group: 'airspace', label: 'Mission plan', detail: 'Waypoint count, duration, battery reserve',
      status: wpStatus,
      value: `${waypoints.length} WPs`,
      blocker: wpStatus === 'block' ? 'No waypoints loaded. Return to Mission Builder.' : undefined,
    };

    // Build static items
    const staticItems: CheckItem[] = STATIC_CHECKS.map(def => {
      const s = STATIC_STATUS[def.id];
      return {
        ...def,
        status:  s?.status  ?? 'ok',
        value:   s?.value   ?? '—',
        warning: s?.warning,
        blocker: s?.blocker,
      };
    });

    // Inject live items at the correct positions within their groups
    const hardware = staticItems.filter(i => i.group === 'hardware');
    hardware.push(batItem); // battery last in hardware

    const sensorsBase = staticItems.filter(i => i.group === 'sensors');
    // Insert gps after compass (index 1)
    const sensors = [
      sensorsBase[0], // imu
      sensorsBase[1], // compass
      gpsItem,
      sensorsBase[2], // imu_temp
    ];

    const connBase = staticItems.filter(i => i.group === 'connectivity');
    const connectivity = [rcItem, ...connBase]; // rc first

    const environment = staticItems.filter(i => i.group === 'environment');

    const airspaceBase = staticItems.filter(i => i.group === 'airspace');
    const airspace = [...airspaceBase, wpItem];

    const operator = staticItems.filter(i => i.group === 'operator');

    return [...hardware, ...sensors, ...connectivity, ...environment, ...airspace, ...operator];
  }, [battery, satellites, signal, connected, waypoints]);

  const blockingCount = useMemo(() => checks.filter(c => c.status === 'block').length, [checks]);
  const warningCount  = useMemo(() => checks.filter(c => c.status === 'warn').length,  [checks]);

  // armReady: derived, never set manually
  const armReady = useMemo(() => {
    const togglesOk =
      vlos &&
      airspaceCleared &&
      (warningCount === 0 || warningsAccepted);
    return blockingCount === 0 && togglesOk;
  }, [blockingCount, vlos, airspaceCleared, warningCount, warningsAccepted]);

  // Preserved navigation call — do not change
  const handleStart = useCallback(() => {
    navigation.navigate('Hud', {missionId});
  }, [navigation, missionId]);

  const groupedChecks = useMemo(() => {
    return GROUPS.map(g => ({
      group: g,
      items: checks.filter(c => c.group === g.id),
    }));
  }, [checks]);

  // ── Drone hardware card ────────────────────────────────────────────────────

  const hardwareCard = (
    <View style={styles.hardwareCard}>
      <View style={styles.hardwareHeader}>
        <Text style={styles.hardwareTitle}>MATRICE 350 RTK</Text>
        <StatusPill
          tone={connected ? 'green' : 'red'}
          icon={connected ? '●' : '○'}
          label={connected ? 'LIVE' : 'OFFLINE'}
          size="sm"
        />
      </View>

      {/* Drone top-down illustration placeholder */}
      <View style={styles.droneIllustration}>
        <Text style={styles.droneArrow}>▲</Text>
        <Text style={styles.droneFront}>FRONT</Text>
        <View style={styles.droneBody}>
          <Text style={styles.droneBodyText}>M350</Text>
        </View>
        <View style={styles.droneArmsRow}>
          <Text style={styles.armLabel}>M1·CW</Text>
          <Text style={styles.armLabel}>M2·CCW</Text>
        </View>
        <View style={styles.droneArmsRow}>
          <Text style={styles.armLabel}>M4·CCW</Text>
          <Text style={styles.armLabel}>M3·CW</Text>
        </View>
        <View style={styles.bayBadge}>
          <Text style={styles.bayBadgeText}>● POWER ON · BAY ARMED</Text>
        </View>
      </View>

      {/* Battery block */}
      <View style={styles.batteryBlock}>
        <Text style={[styles.batteryPct, {color: battery >= 30 ? T.green : battery >= 20 ? T.amber : T.red}]}>
          {battery}%
        </Text>
        <View style={styles.batteryBar}>
          <View
            style={[
              styles.batteryFill,
              {
                width: `${battery}%` as any,
                backgroundColor: battery >= 30 ? T.green : battery >= 20 ? T.amber : T.red,
              },
            ]}
          />
        </View>
        <View style={styles.batteryMeta}>
          <KV label="Voltage" value={batteryV > 0 ? `${batteryV.toFixed(1)} V` : '—'} inline mono noDivider />
          <KV label="Temp"    value={batteryTemp !== 0 ? `${batteryTemp} C` : '—'}    inline mono noDivider />
        </View>
      </View>

      {/* Subsystems */}
      <View style={styles.subsysGrid}>
        <KV label="Satellites" value={`${satellites}`}       inline mono />
        <KV label="RTK"        value={rtkStatus}              inline tone={rtkStatus === 'FIX' ? 'green' : rtkStatus === 'FLOAT' ? 'amber' : 'red'} mono />
        <KV label="RC Signal"  value={connected ? `${signal} dBm` : '—'} inline mono />
        <KV label="Gimbal"     value="READY"                  inline />
        <KV label="Vision"     value="6 / 6 OK"               inline />
        <KV label="Flight ctrl"value="NOMINAL"                 inline noDivider />
      </View>

      {/* Bay footer */}
      <View style={styles.bayFooter}>
        <Text style={styles.bayFooterText}>PAD A-1  · 25.7617, -80.1918</Text>
        <StatusPill tone="green" icon="●" label="READY" size="sm" />
      </View>
    </View>
  );

  // ── Arm gate ──────────────────────────────────────────────────────────────

  const armGate = (
    <View style={styles.armGate}>
      {/* Mission summary 4-up */}
      <View style={styles.missionSummary}>
        <Text style={styles.armSectionTitle}>Mission Summary</Text>
        <Text style={styles.missionName}>{mission?.name ?? '—'}</Text>
        <View style={styles.summaryStats}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{waypoints.length}</Text>
            <Text style={styles.statLabel}>Waypoints</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{mission?.routine_type ?? '—'}</Text>
            <Text style={styles.statLabel}>Routine</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{battery}%</Text>
            <Text style={styles.statLabel}>Battery</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{mission?.status ?? '—'}</Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>
      </View>

      {/* Blocking banner */}
      {blockingCount > 0 && (
        <View style={styles.blockBanner}>
          <Text style={styles.blockBannerText}>
            {blockingCount} BLOCKING {blockingCount === 1 ? 'ISSUE' : 'ISSUES'} — Resolve red items before arming
          </Text>
        </View>
      )}

      {/* Attestations */}
      <View style={styles.attestations}>
        <Text style={styles.armSectionTitle}>Pilot Attestations</Text>

        <AttestationRow
          checked={vlos}
          onToggle={() => setVlos(v => !v)}
          label="I maintain visual line of sight"
          detail="Required — direct unaided VLOS at all times"
          tone="green"
        />
        <AttestationRow
          checked={airspaceCleared}
          onToggle={() => setAirspaceCleared(v => !v)}
          label="Airspace authorization confirmed"
          detail="LAANC acknowledgment and local NOTAMs reviewed"
          tone="green"
        />
        {warningCount > 0 && (
          <AttestationRow
            checked={warningsAccepted}
            onToggle={() => setWarningsAccepted(v => !v)}
            label={`I accept the ${warningCount} warning${warningCount === 1 ? '' : 's'} above`}
            detail="Amber items acknowledged — proceeding with caution"
            tone="amber"
          />
        )}
      </View>

      {/* ARM button */}
      <View style={styles.armBtnWrap}>
        {armReady ? (
          <FlightCtrlBtn
            icon="🚁"
            label="HOLD TO ARM"
            subLabel="2 s"
            severity="green"
            requireHold
            holdDuration={2000}
            onPress={handleStart}
            style={styles.armBtn}
          />
        ) : (
          <View style={[styles.armBtn, styles.armBtnDisabled]}>
            <Text style={styles.armBtnDisabledText}>
              {blockingCount > 0
                ? `RESOLVE ${blockingCount} BLOCKING ${blockingCount === 1 ? 'ISSUE' : 'ISSUES'} TO ARM`
                : 'COMPLETE ATTESTATIONS TO ARM'}
            </Text>
          </View>
        )}
      </View>

      {/* Secondary actions */}
      <View style={styles.secondaryRow}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back to plan">
          <Text style={styles.secondaryBtnText}>Back to plan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => { /* re-run health probe — no-op placeholder */ }}
          accessibilityRole="button"
          accessibilityLabel="Re-run checks">
          <Text style={styles.secondaryBtnText}>Re-run checks</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Layout ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      {/* Top strip */}
      <View style={styles.topStrip}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.screenTitle}>Preflight Checklist</Text>

        <View style={styles.breadcrumb}>
          <BreadcrumbStep state="done"   label="Builder"  index={1} />
          <BreadcrumbConnector done />
          <BreadcrumbStep state="active" label="Preflight" index={2} />
          <BreadcrumbConnector />
          <BreadcrumbStep state="next"   label="Fly"      index={3} />
        </View>

        <StatusPill
          tone={blockingCount > 0 ? 'red' : warningCount > 0 ? 'amber' : 'green'}
          icon={blockingCount > 0 ? '✕' : warningCount > 0 ? '⚠' : '✓'}
          label={blockingCount > 0 ? `${blockingCount} BLOCK` : warningCount > 0 ? `${warningCount} WARN` : 'READY'}
          size="sm"
        />
      </View>

      {/* Body */}
      {isLandscape ? (
        <View style={styles.landscapeBody}>
          {/* Left: hardware card */}
          {hardwareCard}

          {/* Center: checklist */}
          <ScrollView style={styles.checklistScroll} contentContainerStyle={styles.checklistContent}>
            <Text style={styles.checklistSummary}>
              {checks.filter(c => c.status === 'ok').length} of {checks.length} checks passed
              {warningCount > 0 ? ` · ${warningCount} warnings` : ''}
              {blockingCount > 0 ? ` · ${blockingCount} blocking` : ''}
            </Text>
            <View style={styles.sectionGrid}>
              {groupedChecks.map(({group, items}) => (
                <SectionCard key={group.id} group={group} items={items} />
              ))}
            </View>
          </ScrollView>

          {/* Right: arm gate */}
          <ScrollView style={styles.armGateScroll} contentContainerStyle={styles.armGateContent}>
            {armGate}
          </ScrollView>
        </View>
      ) : (
        <ScrollView style={styles.portraitScroll}>
          {hardwareCard}
          <View style={styles.checklistContent}>
            <Text style={styles.checklistSummary}>
              {checks.filter(c => c.status === 'ok').length} of {checks.length} checks passed
            </Text>
            {groupedChecks.map(({group, items}) => (
              <SectionCard key={group.id} group={group} items={items} />
            ))}
          </View>
          {armGate}
        </ScrollView>
      )}
    </View>
  );
}

// ── Attestation row sub-component ─────────────────────────────────────────────

interface AttestationRowProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  detail: string;
  tone: 'green' | 'amber';
}

function AttestationRow({checked, onToggle, label, detail, tone}: AttestationRowProps): React.ReactElement {
  const accentColor = tone === 'green' ? T.green : T.amber;
  return (
    <TouchableOpacity
      style={styles.attestRow}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{checked}}
      accessibilityLabel={label}>
      <View style={[styles.attestBox, checked && {backgroundColor: accentColor, borderColor: accentColor}]}>
        {checked && <Text style={styles.attestCheck}>✓</Text>}
      </View>
      <View style={styles.attestText}>
        <Text style={[styles.attestLabel, checked && {color: accentColor}]}>{label}</Text>
        <Text style={styles.attestDetail}>{detail}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: T.bg},

  // Top strip
  topStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: hairline,
    borderBottomColor: T.hairline,
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  backBtn: {minHeight: hitTarget.btn, justifyContent: 'center', paddingHorizontal: spacing.sm},
  backBtnText: {color: T.cyan, fontSize: fontSize.body, fontWeight: '600'},
  screenTitle: {flex: 1, color: T.t1, fontSize: 18, fontWeight: '700'},
  breadcrumb: {flexDirection: 'row', alignItems: 'center'},

  // Body layouts
  landscapeBody: {flex: 1, flexDirection: 'row'},
  portraitScroll: {flex: 1},

  // Hardware card (left rail)
  hardwareCard: {
    width: 240,
    backgroundColor: T.panel,
    borderRightWidth: hairline,
    borderRightColor: T.hairline,
    padding: spacing.md,
  },
  hardwareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  hardwareTitle: {color: T.t1, fontSize: 12, fontWeight: '700', letterSpacing: 1},

  droneIllustration: {
    backgroundColor: T.card,
    borderRadius: radius.card,
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderWidth: hairline,
    borderColor: T.hairline,
  },
  droneArrow: {color: T.cyan, fontSize: 16, marginBottom: 2},
  droneFront: {color: T.t3, fontSize: 9, letterSpacing: 1, marginBottom: spacing.xs},
  droneBody: {
    width: 56, height: 56, borderRadius: 8,
    backgroundColor: T.cardHi, borderWidth: hairline, borderColor: T.hairline,
    alignItems: 'center', justifyContent: 'center', marginVertical: spacing.sm,
  },
  droneBodyText: {color: T.t2, fontSize: 10, fontWeight: '700'},
  droneArmsRow: {flexDirection: 'row', gap: spacing.xl, marginBottom: 4},
  armLabel: {color: T.t3, fontSize: 9},
  bayBadge: {
    marginTop: spacing.xs,
    backgroundColor: T.green + '22',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  bayBadgeText: {color: T.green, fontSize: 9, fontWeight: '700', letterSpacing: 0.5},

  batteryBlock: {marginBottom: spacing.md},
  batteryPct: {fontSize: 32, fontWeight: '700', textAlign: 'center'},
  batteryBar: {
    height: 6, backgroundColor: T.hairline, borderRadius: 3,
    overflow: 'hidden', marginVertical: spacing.xs,
  },
  batteryFill: {height: '100%', borderRadius: 3},
  batteryMeta: {flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm},

  subsysGrid: {marginBottom: spacing.md},

  bayFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: spacing.sm, borderTopWidth: hairline, borderTopColor: T.hairline,
  },
  bayFooterText: {color: T.t3, fontSize: 9, flex: 1},

  // Checklist center
  checklistScroll: {flex: 1},
  checklistContent: {padding: spacing.md},
  checklistSummary: {
    color: T.t2, fontSize: fontSize.caption, marginBottom: spacing.md,
    textAlign: 'center',
  },
  sectionGrid: {gap: spacing.md},

  sectionCard: {
    backgroundColor: T.panel,
    borderRadius: radius.panel,
    borderWidth: hairline,
    borderColor: T.hairline,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: hairline,
    borderBottomColor: T.hairline,
  },
  sectionLabel: {color: T.t2, fontSize: 11, fontWeight: '700', letterSpacing: 1},

  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: hitTarget.btn,
  },
  checkPill: {marginTop: 2, marginRight: spacing.sm, flexShrink: 0},
  checkText: {flex: 1},
  checkLabel: {color: T.t1, fontSize: fontSize.body, fontWeight: '600', marginBottom: 2},
  checkDetail: {color: T.t3, fontSize: fontSize.caption},
  checkWarn: {color: T.amber, fontSize: fontSize.caption, marginTop: 2},
  checkBlocker: {color: T.red, fontSize: fontSize.caption, marginTop: 2},
  checkValue: {fontSize: fontSize.caption, fontWeight: '700', marginLeft: spacing.sm, marginTop: 2},
  rowDivider: {height: hairline, backgroundColor: T.hairline2, marginHorizontal: spacing.md},

  // Arm gate (right rail)
  armGateScroll: {width: 280},
  armGateContent: {padding: spacing.md},
  armGate: {padding: spacing.md, gap: spacing.md},

  missionSummary: {
    backgroundColor: T.panel, borderRadius: radius.panel,
    borderWidth: hairline, borderColor: T.hairline, padding: spacing.md,
  },
  armSectionTitle: {color: T.t2, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm},
  missionName: {color: T.t1, fontSize: 15, fontWeight: '700', marginBottom: spacing.md},
  summaryStats: {flexDirection: 'row', gap: spacing.sm},
  statBox: {flex: 1, backgroundColor: T.card, borderRadius: radius.card, padding: spacing.sm, alignItems: 'center'},
  statValue: {color: T.t1, fontSize: 13, fontWeight: '700'},
  statLabel: {color: T.t3, fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2},

  blockBanner: {
    backgroundColor: T.red + '22',
    borderRadius: radius.card,
    borderWidth: hairline,
    borderColor: T.red,
    padding: spacing.sm,
  },
  blockBannerText: {color: T.red, fontSize: fontSize.caption, fontWeight: '700', textAlign: 'center'},

  attestations: {
    backgroundColor: T.panel, borderRadius: radius.panel,
    borderWidth: hairline, borderColor: T.hairline, padding: spacing.md,
    gap: spacing.sm,
  },
  attestRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    minHeight: hitTarget.btn, paddingVertical: spacing.xs,
  },
  attestBox: {
    width: 22, height: 22, borderRadius: radius.chip,
    borderWidth: 2, borderColor: T.hairline, marginRight: spacing.sm, marginTop: 2,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  attestCheck: {color: T.bg, fontSize: 12, fontWeight: '700'},
  attestText: {flex: 1},
  attestLabel: {color: T.t1, fontSize: fontSize.body, fontWeight: '600', marginBottom: 2},
  attestDetail: {color: T.t3, fontSize: fontSize.caption},

  armBtnWrap: {gap: spacing.sm},
  armBtn: {minHeight: 64, borderRadius: radius.btnLg},
  armBtnDisabled: {
    backgroundColor: T.slate + '44',
    borderRadius: radius.btnLg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
    borderWidth: hairline,
    borderColor: T.slate,
  },
  armBtnDisabledText: {
    color: T.t3, fontSize: 13, fontWeight: '700', letterSpacing: 0.8,
    textTransform: 'uppercase', textAlign: 'center', paddingHorizontal: spacing.sm,
  },

  secondaryRow: {flexDirection: 'row', gap: spacing.sm},
  secondaryBtn: {
    flex: 1, minHeight: hitTarget.btn, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.card, borderWidth: hairline, borderColor: T.hairline,
  },
  secondaryBtnText: {color: T.t2, fontSize: 13, fontWeight: '600'},
});
