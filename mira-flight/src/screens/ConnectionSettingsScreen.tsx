import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {T, spacing, radius, fontSize, fontFamily, hitTarget} from '../theme/tokens';
import {
  useConnectionStore,
  AdapterType,
  ConnectionConfig,
} from '../store/connectionStore';
import {createAdapter} from '../adapters/adapterFactory';

const ADAPTER_OPTIONS: {
  type: AdapterType;
  label: string;
  sub: string;
}[] = [
  {type: 'mock', label: 'Mock (Simulator)', sub: 'Full simulated flight — no hardware needed'},
  {type: 'sitl', label: 'ArduPilot SITL', sub: 'MAVLink over UDP to a running SITL instance'},
  {type: 'dji', label: 'DJI (via RC USB)', sub: 'Connect M350 RTK through the RC controller'},
];

export default function ConnectionSettingsScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const {config, setConfig, setStatus, persistConfig} = useConnectionStore();

  const [localConfig, setLocalConfig] = useState<ConnectionConfig>({...config});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [testError, setTestError] = useState('');
  const [saving, setSaving] = useState(false);

  const patchLocal = (patch: Partial<ConnectionConfig>) =>
    setLocalConfig(s => ({...s, ...patch}));

  const handleTest = async () => {
    if (localConfig.adapterType !== 'sitl') {return;}
    if (!localConfig.sitlHost.trim()) {
      setTestResult('fail');
      setTestError('Enter a host IP first');
      return;
    }
    setTesting(true);
    setTestResult('idle');
    setTestError('');
    try {
      const adapter = createAdapter(localConfig);
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out')), 5000),
      );
      await Promise.race([adapter.connect(), timeout]);
      await adapter.disconnect();
      setTestResult('ok');
    } catch (err: unknown) {
      setTestResult('fail');
      setTestError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setConfig(localConfig);
    await persistConfig();
    setStatus('disconnected');
    setSaving(false);
    navigation.goBack();
  };

  const statusColor =
    testResult === 'ok' ? T.green :
    testResult === 'fail' ? T.red : T.t3;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.eyebrow}>DRONE CONNECTION</Text>
          <Text style={styles.title}>Connection Settings</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Adapter picker */}
        <Text style={styles.sectionLabel}>ADAPTER</Text>
        {ADAPTER_OPTIONS.map(opt => {
          const active = localConfig.adapterType === opt.type;
          return (
            <TouchableOpacity
              key={opt.type}
              style={[styles.adapterCard, active && styles.adapterCardActive]}
              onPress={() => patchLocal({adapterType: opt.type})}
              activeOpacity={0.75}>
              <View style={[styles.adapterRadio, active && styles.adapterRadioActive]}>
                {active && <View style={styles.adapterRadioDot}/>}
              </View>
              <View style={styles.adapterText}>
                <Text style={[styles.adapterLabel, active && styles.adapterLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={styles.adapterSub}>{opt.sub}</Text>
              </View>
              {opt.type === 'dji' && (
                <View style={styles.djiTag}>
                  <Text style={styles.djiTagText}>E-2</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* SITL config */}
        {localConfig.adapterType === 'sitl' && (
          <View style={styles.sitlBlock}>
            <Text style={styles.sectionLabel}>SITL HOST</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                value={localConfig.sitlHost}
                onChangeText={v => patchLocal({sitlHost: v})}
                placeholder="192.168.1.xxx"
                placeholderTextColor={T.t3}
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
              />
              <View style={styles.portBlock}>
                <Text style={styles.portLabel}>PORT</Text>
                <TextInput
                  style={[styles.input, styles.portInput]}
                  value={String(localConfig.sitlPort)}
                  onChangeText={v => {
                    const n = parseInt(v, 10);
                    if (!isNaN(n)) {patchLocal({sitlPort: n});}
                  }}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.protoBlock}>
                <Text style={styles.portLabel}>PROTO</Text>
                <View style={styles.protoTag}>
                  <Text style={styles.protoTagText}>UDP</Text>
                </View>
              </View>
            </View>

            {/* Test connection */}
            <TouchableOpacity
              style={[styles.testBtn, testing && styles.testBtnBusy]}
              onPress={handleTest}
              disabled={testing}
              activeOpacity={0.8}>
              {testing ? (
                <ActivityIndicator size="small" color={T.cyan}/>
              ) : (
                <Text style={styles.testBtnText}>TEST CONNECTION</Text>
              )}
            </TouchableOpacity>

            {testResult !== 'idle' && (
              <View style={[styles.testResult, {borderColor: statusColor + '55'}]}>
                <View style={[styles.testDot, {backgroundColor: statusColor}]}/>
                <Text style={[styles.testResultText, {color: statusColor}]}>
                  {testResult === 'ok'
                    ? 'Connected — SITL reachable'
                    : `Failed: ${testError}`}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* DJI instructions */}
        {localConfig.adapterType === 'dji' && (
          <View style={styles.djiBlock}>
            <View style={styles.djiRow}>
              <Text style={styles.djiStep}>1.</Text>
              <Text style={styles.djiStepText}>Power on the M350 RTK and RC controller</Text>
            </View>
            <View style={styles.djiRow}>
              <Text style={styles.djiStep}>2.</Text>
              <Text style={styles.djiStepText}>Connect RC to this tablet via USB-C</Text>
            </View>
            <View style={styles.djiRow}>
              <Text style={styles.djiStep}>3.</Text>
              <Text style={styles.djiStepText}>App auto-detects via MSDK — no IP required</Text>
            </View>
            <View style={[styles.testResult, {borderColor: T.amber + '55', marginTop: spacing.lg}]}>
              <View style={[styles.testDot, {backgroundColor: T.amber}]}/>
              <Text style={[styles.testResultText, {color: T.amber}]}>
                DJI native bridge (E-2) not yet built
              </Text>
            </View>
          </View>
        )}

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnBusy]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}>
          {saving ? (
            <ActivityIndicator size="small" color={T.bg}/>
          ) : (
            <Text style={styles.saveBtnText}>SAVE & CONNECT</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: T.hairline,
    backgroundColor: T.panel,
  },
  backBtn: {
    width: hitTarget.iconBtn,
    height: hitTarget.iconBtn,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: T.hairline,
  },
  backArrow: {
    fontSize: 20,
    color: T.t2,
  },
  eyebrow: {
    fontSize: fontSize.caption,
    color: T.cyan,
    fontFamily: fontFamily.ui,
    fontWeight: '600',
    letterSpacing: 0.18,
  },
  title: {
    fontSize: 22,
    color: T.t1,
    fontFamily: fontFamily.ui,
    fontWeight: '500',
    marginTop: 2,
  },
  scroll: {flex: 1},
  scrollContent: {
    padding: spacing.xl,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.caption,
    color: T.t3,
    fontFamily: fontFamily.ui,
    fontWeight: '600',
    letterSpacing: 0.18,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  adapterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: T.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: T.hairline,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    minHeight: hitTarget.btn,
  },
  adapterCardActive: {
    borderColor: T.cyan,
    backgroundColor: T.panelHi,
  },
  adapterRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: T.t3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adapterRadioActive: {
    borderColor: T.cyan,
  },
  adapterRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: T.cyan,
  },
  adapterText: {flex: 1},
  adapterLabel: {
    fontSize: fontSize.body,
    color: T.t2,
    fontFamily: fontFamily.ui,
    fontWeight: '500',
  },
  adapterLabelActive: {color: T.t1},
  adapterSub: {
    fontSize: fontSize.caption,
    color: T.t3,
    fontFamily: fontFamily.ui,
    marginTop: 2,
  },
  djiTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.chip,
    backgroundColor: T.purple + '22',
    borderWidth: 1,
    borderColor: T.purple + '55',
  },
  djiTagText: {
    fontSize: 10,
    color: T.purple,
    fontFamily: fontFamily.mono,
    fontWeight: '600',
    letterSpacing: 0.08,
  },
  sitlBlock: {marginTop: spacing.sm},
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-end',
  },
  input: {
    height: 52,
    backgroundColor: T.panelHi,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: T.hairline,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.body,
    color: T.t1,
    fontFamily: fontFamily.mono,
  },
  inputFlex: {flex: 1},
  portBlock: {alignItems: 'center', gap: 4},
  portLabel: {
    fontSize: 10,
    color: T.t3,
    fontFamily: fontFamily.ui,
    fontWeight: '600',
    letterSpacing: 0.14,
  },
  portInput: {width: 80},
  protoBlock: {alignItems: 'center', gap: 4},
  protoTag: {
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: T.panelHi,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: T.hairline,
  },
  protoTagText: {
    fontSize: fontSize.caption,
    color: T.cyan,
    fontFamily: fontFamily.mono,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  testBtn: {
    height: hitTarget.btn,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.btn,
    borderWidth: 1,
    borderColor: T.cyan + '88',
    marginTop: spacing.md,
  },
  testBtnBusy: {borderColor: T.hairline},
  testBtnText: {
    fontSize: fontSize.caption,
    color: T.cyan,
    fontFamily: fontFamily.ui,
    fontWeight: '700',
    letterSpacing: 0.16,
  },
  testResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    backgroundColor: T.bg,
  },
  testDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  testResultText: {
    flex: 1,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.ui,
  },
  djiBlock: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    backgroundColor: T.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: T.hairline,
    gap: spacing.md,
  },
  djiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  djiStep: {
    fontSize: fontSize.body,
    color: T.cyan,
    fontFamily: fontFamily.mono,
    fontWeight: '600',
    width: 20,
  },
  djiStepText: {
    flex: 1,
    fontSize: fontSize.body,
    color: T.t2,
    fontFamily: fontFamily.ui,
  },
  saveBtn: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.btnLg,
    backgroundColor: T.cyan,
    marginTop: spacing.xxl,
  },
  saveBtnBusy: {backgroundColor: T.cyanDim},
  saveBtnText: {
    fontSize: fontSize.body,
    color: T.bg,
    fontFamily: fontFamily.ui,
    fontWeight: '700',
    letterSpacing: 0.12,
  },
});
