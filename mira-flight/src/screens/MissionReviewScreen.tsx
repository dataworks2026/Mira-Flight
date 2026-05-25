import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  useWindowDimensions,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useMissionStore} from '../store/missionStore';
import {miraClient} from '../api/miraClient';
import {Mission} from '../types/shared';
import {RootStackParamList} from '../App';
import {KV, StatusPill, BreadcrumbStep, BreadcrumbConnector} from '../components';
import {T, spacing, radius, fontFamily, fontSize} from '../theme/tokens';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'summary' | 'captures' | 'log';

export default function MissionReviewScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<any>();
  const {width, height} = useWindowDimensions();
  const isLandscape = width > height;

  // ── Store ───────────────────────────────────────────────────────────────────
  const mission = useMissionStore(s => s.currentMission);
  const photosCount = useMissionStore(s => s.photosCount);
  const uploadedCount = useMissionStore(s => s.uploadedCount);
  const missionState = useMissionStore(s => s.missionState);
  const setAnalyzedCount = useMissionStore(s => s.setAnalyzedCount);
  const setMission = useMissionStore(s => s.setMission);
  const reset = useMissionStore(s => s.reset);

  const [freshMission, setFreshMission] = useState<Mission | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [retrying, setRetrying] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);

  // PRESERVED — mission fetch + setAnalyzedCount
  useEffect(() => {
    const missionId = route.params?.missionId ?? mission?.id;
    if (!missionId) {
      return;
    }
    miraClient
      .getMission(missionId)
      .then(m => {
        setFreshMission(m);
        setMission(m);
        setAnalyzedCount(m.photos_analyzed);
      })
      .catch(() => {});
  }, [route.params?.missionId, mission?.id, setMission, setAnalyzedCount]);

  const handleRetryUpload = async () => {
    const id = route.params?.missionId ?? mission?.id;
    if (!id) {return;}
    setRetrying(true);
    setRetryFailed(false);
    try {
      const m = await miraClient.getMission(id);
      setFreshMission(m);
      setMission(m);
      setAnalyzedCount(m.photos_analyzed);
    } catch {
      setRetryFailed(true);
    } finally {
      setRetrying(false);
    }
  };

  // PRESERVED — reset on return home
  const handleReturnHome = () => {
    reset();
    navigation.navigate('Home');
  };

  // ── Derived values ──────────────────────────────────────────────────────────
  const display = freshMission ?? mission;
  const analyzed = display?.photos_analyzed ?? 0;
  const total = display?.total_photos || photosCount;
  const uploaded = display?.photos_uploaded ?? uploadedCount;

  const uploadPct = total > 0 ? Math.round((uploaded / total) * 100) : 0;
  const analyzedPct = total > 0 ? Math.round((analyzed / total) * 100) : 0;
  const odmStatus = display?.odm_status || (missionState === 'COMPLETED' ? 'complete' : 'pending');

  const odmTone = odmStatus === 'complete' ? 'green'
    : odmStatus === 'failed' ? 'red'
    : 'amber';

  // ── Sections ────────────────────────────────────────────────────────────────
  const header = (
    <View style={s.header}>
      <View style={s.headerLeft}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backBtn}>← Back</Text>
        </TouchableOpacity>
        <View style={s.titleBlock}>
          <Text style={s.title}>Mission Complete</Text>
          <Text style={s.subtitle}>{display?.name || 'Mission'}</Text>
        </View>
      </View>
      <View style={s.breadcrumbRow}>
        <BreadcrumbStep index={1} label="Builder" state="done" />
        <BreadcrumbConnector done />
        <BreadcrumbStep index={2} label="Preflight" state="done" />
        <BreadcrumbConnector done />
        <BreadcrumbStep index={3} label="Fly" state="done" />
      </View>
    </View>
  );

  const kpiGrid = (
    <View style={s.kpiGrid}>
      <View style={s.kpiCard}>
        <Text style={s.kpiValue}>{total}</Text>
        <Text style={s.kpiLabel}>PHOTOS</Text>
      </View>
      <View style={s.kpiCard}>
        <Text style={[s.kpiValue, uploadPct === 100 ? s.valGreen : s.valAmber]}>
          {uploadPct}%
        </Text>
        <Text style={s.kpiLabel}>UPLOADED</Text>
      </View>
      <View style={s.kpiCard}>
        <Text style={[s.kpiValue, analyzedPct === 100 ? s.valGreen : s.valAmber]}>
          {analyzedPct}%
        </Text>
        <Text style={s.kpiLabel}>ANALYZED</Text>
      </View>
      <View style={s.kpiCard}>
        <StatusPill
          tone={odmTone}
          icon={<Text style={{fontSize: 12}}>{odmTone === 'green' ? '✓' : odmTone === 'red' ? '✕' : '…'}</Text>}
          label={odmStatus.toUpperCase()}
        />
        <Text style={s.kpiLabel}>ODM</Text>
      </View>
    </View>
  );

  const tabs = (
    <View style={s.tabRow}>
      {(['summary', 'captures', 'log'] as Tab[]).map(t => (
        <TouchableOpacity
          key={t}
          style={[s.tabBtn, activeTab === t && s.tabBtnActive]}
          onPress={() => setActiveTab(t)}>
          <Text style={[s.tabText, activeTab === t && s.tabTextActive]}>
            {t.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const summaryContent = (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Mission Details</Text>
      <KV label="Mission" value={display?.name ?? '—'} />
      <KV label="Routine" value={display?.routine_type ?? '—'} />
      <KV label="Status" value={display?.status ?? missionState ?? '—'} />
      <KV label="Photos" value={`${total}`} mono />
      <KV label="Uploaded" value={`${uploaded} / ${total}`} mono />
      <KV label="Analyzed" value={`${analyzed} / ${total}`} mono />
      <KV label="ODM" value={odmStatus} tone={odmTone} />
    </View>
  );

  const capturesContent = (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Photo Captures</Text>
      <View style={s.uploadBar}>
        <View style={[s.uploadFill, {width: `${uploadPct}%` as any}]} />
      </View>
      <Text style={s.uploadLabel}>{uploaded} of {total} uploaded ({uploadPct}%)</Text>
      <View style={s.uploadBar}>
        <View style={[s.analyzedFill, {width: `${analyzedPct}%` as any}]} />
      </View>
      <Text style={s.uploadLabel}>{analyzed} of {total} analyzed ({analyzedPct}%)</Text>

      {total > 0 && uploadPct < 100 && display?.status !== 'in_progress' && (
        <View>
          <View style={s.uploadFailBanner}>
            <Text style={s.uploadFailText}>
              ⚠  {total - uploaded} photo{total - uploaded !== 1 ? 's' : ''} not uploaded
            </Text>
            <TouchableOpacity
              style={[s.retryBtn, retrying && s.retryBtnBusy]}
              onPress={handleRetryUpload}
              disabled={retrying}
              activeOpacity={0.8}>
              <Text style={s.retryBtnText}>{retrying ? 'REFRESHING…' : 'RETRY'}</Text>
            </TouchableOpacity>
          </View>
          {retryFailed && (
            <Text style={s.retryFailedText}>Refresh failed — check connection</Text>
          )}
        </View>
      )}
    </View>
  );

  const logContent = (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Flight Log</Text>
      <KV label="Mission ID" value={display?.id ?? '—'} mono />
      <KV label="Asset" value={display?.asset_id ?? '—'} mono />
      <KV label="ODM Status" value={odmStatus} tone={odmTone} />
      <Text style={s.logNote}>
        Full telemetry log available on the web dashboard.
      </Text>
    </View>
  );

  const tabContent =
    activeTab === 'summary' ? summaryContent
    : activeTab === 'captures' ? capturesContent
    : logContent;

  const footerActions = (
    <View style={[s.footer, isLandscape && s.footerLandscape]}>
      <TouchableOpacity
        style={s.dashBtn}
        onPress={() => Linking.openURL('http://3.144.48.124/dashboard')}>
        <Text style={s.dashBtnText}>Open Dashboard</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.homeBtn} onPress={handleReturnHome}>
        <Text style={s.homeBtnText}>Return Home</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLandscape) {
    return (
      <View style={s.root}>
        {header}
        <View style={s.body}>
          <View style={s.leftRail}>
            {kpiGrid}
            {footerActions}
          </View>
          <View style={s.center}>
            {tabs}
            <ScrollView>{tabContent}</ScrollView>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {header}
      <ScrollView style={s.scroll}>
        {kpiGrid}
        {tabs}
        {tabContent}
      </ScrollView>
      {footerActions}
    </View>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: T.bg},
  scroll: {flex: 1},

  // Header
  header: {
    backgroundColor: T.panel,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: T.hairline,
    gap: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  titleBlock: {flex: 1},
  backBtn: {fontSize: 16, color: T.cyan, fontWeight: '600'},
  title: {
    fontSize: fontSize.pageTitle,
    fontWeight: '800',
    color: T.t1,
    fontFamily: fontFamily.ui,
  },
  subtitle: {fontSize: 14, color: T.t2, marginTop: 2, fontFamily: fontFamily.ui},
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Body (landscape)
  body: {flex: 1, flexDirection: 'row'},
  leftRail: {
    width: 260,
    backgroundColor: T.panel,
    borderRightWidth: 1,
    borderRightColor: T.hairline,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  center: {flex: 1, backgroundColor: T.bg},

  // KPI
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  kpiCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: T.card,
    borderRadius: radius.card,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.hairline,
    gap: spacing.xs,
  },
  kpiValue: {
    fontSize: fontSize.cardTitle,
    fontWeight: '800',
    color: T.t1,
    fontFamily: fontFamily.mono,
  },
  kpiLabel: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: T.t3,
    letterSpacing: 0.8,
    fontFamily: fontFamily.ui,
  },
  valGreen: {color: T.green},
  valAmber: {color: T.amber},

  // Tabs
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: T.hairline,
    paddingHorizontal: spacing.lg,
  },
  tabBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabBtnActive: {borderBottomColor: T.cyan},
  tabText: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: T.t3,
    letterSpacing: 0.8,
    fontFamily: fontFamily.ui,
  },
  tabTextActive: {color: T.cyan},

  // Section
  section: {padding: spacing.lg},
  sectionTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: T.t2,
    letterSpacing: 0.6,
    marginBottom: spacing.md,
    fontFamily: fontFamily.ui,
  },
  logNote: {
    fontSize: fontSize.caption,
    color: T.t3,
    marginTop: spacing.lg,
    fontStyle: 'italic',
  },

  // Upload bars
  uploadBar: {
    height: 6,
    backgroundColor: T.hairline,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  uploadFill: {
    height: '100%',
    backgroundColor: T.cyan,
    borderRadius: radius.pill,
  },
  analyzedFill: {
    height: '100%',
    backgroundColor: T.green,
    borderRadius: radius.pill,
  },
  uploadLabel: {
    fontSize: fontSize.caption,
    color: T.t2,
    marginTop: spacing.xs,
    fontFamily: fontFamily.mono,
  },

  // Footer
  footer: {
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: T.hairline,
  },
  footerLandscape: {flexDirection: 'column', gap: spacing.sm},
  dashBtn: {
    borderWidth: 1,
    borderColor: T.cyan,
    borderRadius: radius.btnLg,
    padding: spacing.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  dashBtnText: {color: T.cyan, fontSize: 15, fontWeight: '600', fontFamily: fontFamily.ui},
  homeBtn: {
    backgroundColor: T.cyan,
    borderRadius: radius.btnLg,
    padding: spacing.md,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  homeBtnText: {
    color: T.bg,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fontFamily.ui,
  },
  uploadFailBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${T.amber}18`,
    borderWidth: 1,
    borderColor: `${T.amber}55`,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  uploadFailText: {
    flex: 1,
    fontSize: fontSize.caption,
    color: T.amber,
    fontFamily: fontFamily.ui,
    fontWeight: '600',
  },
  retryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.btn,
    backgroundColor: `${T.amber}22`,
    borderWidth: 1,
    borderColor: `${T.amber}55`,
  },
  retryBtnBusy: {opacity: 0.5},
  retryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: T.amber,
    fontFamily: fontFamily.ui,
    letterSpacing: 0.1,
  },
  retryFailedText: {
    fontSize: 11,
    color: T.red,
    fontFamily: fontFamily.ui,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
});
