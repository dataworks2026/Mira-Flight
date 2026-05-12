import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuthStore} from '../store/authStore';
import {RootStackParamList} from '../App';

const TEAL = '#00897B';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<NavProp>();
  const login = useAuthStore(s => s.login);
  const {width, height} = useWindowDimensions();
  const isLandscape = width > height;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Enter email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigation.reset({index: 0, routes: [{name: 'Home'}]});
    } catch (err: any) {
      Alert.alert('Login Failed', err?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.inner, isLandscape && styles.innerLandscape]}>
        <View style={[styles.card, isLandscape && styles.cardLandscape]}>
          <Text style={styles.title}>Mira Flight</Text>
          <Text style={styles.subtitle}>Ground Control Station</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F2F1',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  innerLandscape: {
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    elevation: 4,
  },
  cardLandscape: {
    width: 400,
    maxWidth: '80%' as any,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: TEAL,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  loginBtn: {
    backgroundColor: TEAL,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginBtnText: {color: '#FFF', fontSize: 17, fontWeight: '700'},
});
