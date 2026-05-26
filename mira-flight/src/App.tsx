import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {DroneContext, DroneAdapter} from './adapters/DroneAdapter';
import {createAdapter} from './adapters/adapterFactory';
import {MockAdapter} from './adapters/MockAdapter';
import {useAuthStore} from './store/authStore';
import {useDroneStore} from './store/droneStore';
import {useConnectionStore} from './store/connectionStore';
import {updateTelemetryStore} from './telemetry/TelemetryStore';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import MissionPlannerScreen from './screens/MissionPlannerScreen';
import PreflightScreen from './screens/PreflightScreen';
import HudScreen from './screens/HudScreen';
import MissionReviewScreen from './screens/MissionReviewScreen';
import FleetScreen from './screens/FleetScreen';
import ConnectionSettingsScreen from './screens/ConnectionSettingsScreen';
import {DebugLogOverlay} from './components/DebugLogOverlay';
import {RootErrorBoundary, installGlobalErrorHandler} from './components/ErrorBoundary';
import {installCrashLogging, miraLog} from './store/logStore';

installGlobalErrorHandler();
installCrashLogging();

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Fleet: undefined;
  MissionPlanner: {missionId?: string};
  Preflight: {missionId: string};
  Hud: {missionId: string};
  MissionReview: {missionId: string};
  ConnectionSettings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App(): React.JSX.Element {
  const token = useAuthStore(s => s.token);
  const loading = useAuthStore(s => s.loading);
  const restoreSession = useAuthStore(s => s.restoreSession);
  const {config, loadConfig, setStatus} = useConnectionStore();

  const [adapter, setAdapter] = useState<DroneAdapter>(() => new MockAdapter());
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    restoreSession();
    loadConfig();
  }, [restoreSession, loadConfig]);

  // Re-create and connect adapter whenever config changes
  useEffect(() => {
    // Tear down previous adapter
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    adapter.disconnect().catch(() => {}); // non-fatal: adapter may already be closed

    setStatus('connecting');
    const next = createAdapter(config);
    setAdapter(next);

    const unsub = next.onTelemetry(updateTelemetryStore);
    unsubRef.current = unsub;

    next
      .connect()
      .then(() => {
        useDroneStore.getState().setConnected(true);
        setStatus('connected');
      })
      .catch((err: unknown) => {
        useDroneStore.getState().setConnected(false);
        const msg = err instanceof Error ? err.message : 'Connection failed';
        miraLog('error', 'ADAPTER', `connect failed (${config.adapterType}): ${msg}`);
        setStatus('failed', msg);
      });

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
      next.disconnect().catch(() => {}); // non-fatal: cleanup on unmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.adapterType, config.sitlHost, config.sitlPort]);

  if (loading) {
    return <></>;
  }

  return (
    <RootErrorBoundary>
    <View style={appSt.root}>
      <DroneContext.Provider value={adapter}>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName={token ? 'Home' : 'Login'}
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Fleet" component={FleetScreen} />
            <Stack.Screen name="MissionPlanner" component={MissionPlannerScreen} />
            <Stack.Screen name="Preflight" component={PreflightScreen} />
            <Stack.Screen name="Hud" component={HudScreen} />
            <Stack.Screen name="MissionReview" component={MissionReviewScreen} />
            <Stack.Screen
              name="ConnectionSettings"
              component={ConnectionSettingsScreen}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </DroneContext.Provider>
      <DebugLogOverlay />
    </View>
    </RootErrorBoundary>
  );
}

const appSt = StyleSheet.create({
  root: {flex: 1},
});
