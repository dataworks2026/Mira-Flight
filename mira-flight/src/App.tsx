import React, {useMemo} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {DroneContext} from './adapters/DroneAdapter';
import {MockAdapter} from './adapters/MockAdapter';
import HomeScreen from './screens/HomeScreen';
import MissionPlannerScreen from './screens/MissionPlannerScreen';
import PreflightScreen from './screens/PreflightScreen';
import HudScreen from './screens/HudScreen';
import MissionReviewScreen from './screens/MissionReviewScreen';

export type RootStackParamList = {
  Home: undefined;
  MissionPlanner: {missionId?: string};
  Preflight: {missionId: string};
  Hud: {missionId: string};
  MissionReview: {missionId: string};
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App(): React.JSX.Element {
  const adapter = useMemo(() => new MockAdapter(), []);

  return (
    <DroneContext.Provider value={adapter}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="MissionPlanner" component={MissionPlannerScreen} />
          <Stack.Screen name="Preflight" component={PreflightScreen} />
          <Stack.Screen name="Hud" component={HudScreen} />
          <Stack.Screen name="MissionReview" component={MissionReviewScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </DroneContext.Provider>
  );
}
