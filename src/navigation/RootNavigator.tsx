import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthStackParamList, AppStackParamList, StaffTabParamList, AdminTabParamList } from './types';
import { LoginScreen } from '../screens/LoginScreen';
import { RoomsListScreen } from '../screens/RoomsListScreen';
import { RoomDetailsScreen } from '../screens/RoomDetailsScreen';
import { ReportIssueScreen } from '../screens/ReportIssueScreen';
import { HotelSelectScreen } from '../screens/HotelSelectScreen';
import { useAuth } from '../modules/auth/useAuth';
import { useRole } from '../modules/auth/useRole';
import { useHotelStore } from '../modules/hotel/useHotelStore';
import { DEFAULT_HOTEL_CODE } from '../lib/propertyConfig';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const StaffTab = createBottomTabNavigator<StaffTabParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();

const TAB_BAR_STYLE = {
  backgroundColor: '#ffffff',
  borderTopColor: '#e5e7eb',
  borderTopWidth: 1,
  height: 64,
  paddingBottom: 9,
  paddingTop: 7,
};

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 21, color: focused ? '#2563eb' : '#94a3b8' }}>{icon}</Text>;
}

function FrozenTabScreen({ label }: { label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>{label}</Text>
    </View>
  );
}

function frozenListeners() {
  return {
    tabPress: (event: { preventDefault: () => void }) => {
      event.preventDefault();
    },
  };
}

function StaffTabNavigator() {
  return (
    <StaffTab.Navigator
      id="StaffTabs"
      initialRouteName="Calendar"
      screenOptions={{
        tabBarStyle: TAB_BAR_STYLE,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        headerShown: false,
      }}
    >
      <StaffTab.Screen
        name="Home"
        children={() => <FrozenTabScreen label="Home" />}
        listeners={frozenListeners}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon={'\u2302'} focused={focused} />, tabBarLabel: 'Home' }}
      />
      <StaffTab.Screen
        name="Calendar"
        component={RoomsListScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon={'\u25a3'} focused={focused} />, tabBarLabel: 'Calendar' }}
      />
      <StaffTab.Screen
        name="Settings"
        children={() => <FrozenTabScreen label="Settings" />}
        listeners={frozenListeners}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon={'\u2699'} focused={focused} />, tabBarLabel: 'Settings' }}
      />
      <StaffTab.Screen
        name="Profile"
        children={() => <FrozenTabScreen label="Profile" />}
        listeners={frozenListeners}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon={'\u25ef'} focused={focused} />, tabBarLabel: 'Profile' }}
      />
    </StaffTab.Navigator>
  );
}

function AdminTabNavigator() {
  return (
    <AdminTab.Navigator
      id="AdminTabs"
      initialRouteName="Calendar"
      screenOptions={{
        tabBarStyle: TAB_BAR_STYLE,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        headerShown: false,
      }}
    >
      <AdminTab.Screen
        name="Home"
        children={() => <FrozenTabScreen label="Home" />}
        listeners={frozenListeners}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon={'\u2302'} focused={focused} />, tabBarLabel: 'Home' }}
      />
      <AdminTab.Screen
        name="Calendar"
        component={RoomsListScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon={'\u25a3'} focused={focused} />, tabBarLabel: 'Calendar' }}
      />
      <AdminTab.Screen
        name="Settings"
        children={() => <FrozenTabScreen label="Settings" />}
        listeners={frozenListeners}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon={'\u2699'} focused={focused} />, tabBarLabel: 'Settings' }}
      />
      <AdminTab.Screen
        name="Profile"
        children={() => <FrozenTabScreen label="Profile" />}
        listeners={frozenListeners}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon={'\u25ef'} focused={focused} />, tabBarLabel: 'Profile' }}
      />
    </AdminTab.Navigator>
  );
}

function AppNavigator() {
  const { isAdmin } = useRole();
  const { user } = useAuth();
  const { selectedHotel, setSelectedHotel } = useHotelStore();

  useEffect(() => {
    if (selectedHotel) return;
    const hotelCode = user?.hotelCode ?? user?.assignedHotels?.[0] ?? DEFAULT_HOTEL_CODE;
    setSelectedHotel({
      hotelCode,
      name: user?.hotelName ?? hotelCode,
    });
  }, [selectedHotel, setSelectedHotel, user]);

  return (
    <AppStack.Navigator
      id="AppStack"
      initialRouteName={isAdmin ? 'AdminTabs' : 'StaffTabs'}
      screenOptions={{ headerShadowVisible: false, headerTitleAlign: 'left' }}
    >
      {isAdmin ? (
        <AppStack.Screen
          name="AdminTabs"
          component={AdminTabNavigator}
          options={{ headerShown: false }}
        />
      ) : (
        <AppStack.Screen
          name="StaffTabs"
          component={StaffTabNavigator}
          options={{ headerShown: false }}
        />
      )}
      <AppStack.Screen
        name="RoomDetails"
        component={RoomDetailsScreen}
        options={{ title: 'Room details' }}
      />
      <AppStack.Screen
        name="RoomsList"
        component={RoomsListScreen}
        options={{ title: 'Schedule' }}
      />
      <AppStack.Screen
        name="HotelSelect"
        component={HotelSelectScreen}
        options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade' }}
      />
      <AppStack.Screen
        name="ReportIssue"
        component={ReportIssueScreen}
        options={{ title: 'Report an issue' }}
      />
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return (
      <AuthStack.Navigator id="AuthStack" screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login" component={LoginScreen} />
      </AuthStack.Navigator>
    );
  }

  return <AppNavigator />;
}
