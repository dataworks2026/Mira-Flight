import React, {useEffect, useMemo} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {DroneContext} from './adapters/DroneAdapter';
import {MockAdapter} from './adapters/MockAdapter';
import {useAuthStore} from './store/authStore';
import {useDroneStore} from './store/droneStore';
import {updateTelemetryStore} from './telemetry/TelemetryStore';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import MissionPlannerScreen from './screens/MissionPlannerScreen';
import PreflightScreen from './screens/PreflightScreen';
import HudScreen from './screens/HudScreen';
import MissionReviewScreen from './screens/MissionReviewScreen';
import FleetScreen from './screens/FleetScreen';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Fleet: undefined;
  MissionPlanner: {missionId?: string};
  Preflight: {missionId: string};
  Hud: {missionId: string};
  MissionReview: {missionId: string};
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App(): React.JSX.Element {
  const adapter = useMemo(() => new MockAdapter(), []);
  const token = useAuthStore(s => s.token);
  const loading = useAuthStore(s => s.loading);
  const restoreSession = useAuthStore(s => s.restoreSession);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    const unsub = adapter.onTelemetry(updateTelemetryStore);
    adapter.connect().then(() => {
      useDroneStore.getState().setConnected(true);
    });
    return () => {
      unsub();
      adapter.disconnect();
    };
  }, [adapter]);

  if (loading) {
    return <></>;
  }

  return (
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
        </Stack.Navigator>
      </NavigationContainer>
    </DroneContext.Provider>
  );
}
