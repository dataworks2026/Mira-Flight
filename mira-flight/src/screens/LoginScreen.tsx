import React, {useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuthStore} from '../store/authStore';
import {RootStackParamList} from '../App';
import {
  T,
  spacing,
  radius,
  fontSize,
  fontFamily,
  hairline,
  hitTarget,
} from '../theme/tokens';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function hasCapsLock(text: string): boolean {
  if (text.length < 2) {return false;}
  const letters = text.replace(/[^a-zA-Z]/g, '');
  return letters.length > 0 && letters === letters.toUpperCase();
}

export default function LoginScreen() {
  const navigation = useNavigation<NavProp>();
  const login = useAuthStore(s => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const capsWarning = passFocused && !showPassword && hasCapsLock(password);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Enter email and password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigation.reset({index: 0, routes: [{name: 'Home'}]});
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={s.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Brand lockup */}
        <View style={s.brand}>
          <Text style={s.brandMark}>MIRA</Text>
          <Text style={s.brandSub}>Mira Flight</Text>
        </View>

        {/* Sign-in card */}
        <View style={s.card}>
          <Text style={s.eyebrow}>GROUND CONTROL STATION</Text>
          <Text style={s.title}>Sign in</Text>

          {/* Username */}
          <View style={s.fieldBlock}>
            <Text style={s.fieldLabel}>USERNAME</Text>
            <View style={s.inputWrap}>
              <Text style={s.inputIcon}>◈</Text>
              <TextInput
                style={s.input}
                placeholder="pilot@org.example"
                placeholderTextColor={T.t3}
                value={email}
                onChangeText={v => {setEmail(v); setError('');}}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Password */}
          <View style={s.fieldBlock}>
            <Text style={s.fieldLabel}>PASSWORD</Text>
            <View style={s.inputWrap}>
              <Text style={s.inputIcon}>◉</Text>
              <TextInput
                ref={passwordRef}
                style={[s.input, s.inputPass]}
                placeholder="••••••••••••"
                placeholderTextColor={T.t3}
                value={password}
                onChangeText={v => {setPassword(v); setError('');}}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
              />
              <TouchableOpacity
                style={s.eyeBtn}
                onPress={() => setShowPassword(v => !v)}
                hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
                <Text style={s.eyeText}>{showPassword ? '○' : '◎'}</Text>
              </TouchableOpacity>
            </View>
            {capsWarning && (
              <Text style={s.capsHint}>⇪ CAPS LOCK ON</Text>
            )}
          </View>

          {/* Inline error */}
          {!!error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* Sign-in button */}
          <TouchableOpacity
            style={[s.signInBtn, loading && s.signInBtnBusy]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Sign in">
            {loading ? (
              <ActivityIndicator size="small" color={T.bg} />
            ) : (
              <Text style={s.signInBtnText}>SIGN IN</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* GCS status line */}
        <View style={s.statusRow}>
          <View style={s.statusDot} />
          <Text style={s.statusText}>GCS · ONLINE</Text>
          <Text style={s.statusDivider}>·</Text>
          <Text style={s.statusVersion}>v1.84.3</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },

  // Brand lockup
  brand: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brandMark: {
    fontSize: 36,
    fontWeight: '900',
    color: T.cyan,
    fontFamily: fontFamily.ui,
    letterSpacing: 8,
  },
  brandSub: {
    fontSize: fontSize.caption,
    color: T.t3,
    fontFamily: fontFamily.ui,
    marginTop: 4,
    letterSpacing: 0.1,
  },

  // Card
  card: {
    width: 520,
    maxWidth: '96%',
    backgroundColor: T.panel,
    borderRadius: radius.panel,
    borderWidth: hairline,
    borderColor: T.hairline,
    paddingHorizontal: 40,
    paddingTop: 40,
    paddingBottom: 32,
    elevation: 8,
  },
  eyebrow: {
    fontSize: fontSize.caption,
    color: T.cyan,
    fontFamily: fontFamily.ui,
    fontWeight: '700',
    letterSpacing: 0.18,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: T.t1,
    fontFamily: fontFamily.ui,
    marginBottom: 28,
  },

  // Fields
  fieldBlock: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: 10,
    color: T.t3,
    fontFamily: fontFamily.ui,
    fontWeight: '700',
    letterSpacing: 0.16,
    marginBottom: spacing.xs,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: T.panelHi,
    borderRadius: radius.btn,
    borderWidth: hairline,
    borderColor: T.hairline,
    overflow: 'hidden',
  },
  inputIcon: {
    fontSize: 14,
    color: T.t3,
    paddingLeft: 14,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: fontSize.body,
    color: T.t1,
    fontFamily: fontFamily.ui,
    paddingRight: spacing.md,
  },
  inputPass: {
    paddingRight: 44,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  eyeText: {
    fontSize: 16,
    color: T.t3,
  },
  capsHint: {
    fontSize: 10,
    color: T.amber,
    fontFamily: fontFamily.ui,
    fontWeight: '600',
    letterSpacing: 0.1,
    marginTop: spacing.xs,
  },

  // Inline error
  errorBox: {
    backgroundColor: T.red + '18',
    borderRadius: radius.btn,
    borderWidth: hairline,
    borderColor: T.red + '44',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: fontSize.caption,
    color: T.red,
    fontFamily: fontFamily.ui,
  },

  // Sign-in button
  signInBtn: {
    height: hitTarget.btn,
    backgroundColor: T.cyan,
    borderRadius: radius.btn,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  signInBtnBusy: {
    backgroundColor: T.cyanDim,
  },
  signInBtnText: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: T.bg,
    fontFamily: fontFamily.ui,
    letterSpacing: 0.14,
  },

  // GCS status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 24,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.green,
  },
  statusText: {
    fontSize: 11,
    color: T.t3,
    fontFamily: fontFamily.ui,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  statusDivider: {
    fontSize: 11,
    color: T.t3,
    fontFamily: fontFamily.ui,
  },
  statusVersion: {
    fontSize: 11,
    color: T.t3,
    fontFamily: fontFamily.ui,
    letterSpacing: 0.1,
  },
});
