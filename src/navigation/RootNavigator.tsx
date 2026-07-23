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
import { colors } from '../lib/theme';
import { Icon, IconName } from '../components/ui/Icon';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const StaffTab = createBottomTabNavigator<StaffTabParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();

const TAB_BAR_STYLE = {
  backgroundColor: colors.card,
  borderTopColor: colors.border,
  borderTopWidth: 1,
  height: 64,
  paddingBottom: 9,
  paddingTop: 7,
};

const TAB_TRANSITION = {
  animation: 'timing' as const,
  config: {
    duration: 180,
  },
};

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return <Icon name={name} size={22} color={focused ? colors.primary : colors.mutedForeground} />;
}

function FrozenTabScreen({ label }: { label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground }}>{label}</Text>
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
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarHideOnKeyboard: true,
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        lazy: false,
        freezeOnBlur: true,
        animation: 'shift',
        transitionSpec: TAB_TRANSITION,
      }}
    >
      <StaffTab.Screen
        name="Home"
        children={() => <FrozenTabScreen label="Home" />}
        listeners={frozenListeners}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />, tabBarLabel: 'Home' }}
      />
      <StaffTab.Screen
        name="Calendar"
        component={RoomsListScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} />, tabBarLabel: 'Calendar' }}
      />
      <StaffTab.Screen
        name="Settings"
        children={() => <FrozenTabScreen label="Settings" />}
        listeners={frozenListeners}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />, tabBarLabel: 'Settings' }}
      />
      <StaffTab.Screen
        name="Profile"
        children={() => <FrozenTabScreen label="Profile" />}
        listeners={frozenListeners}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} />, tabBarLabel: 'Profile' }}
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
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarHideOnKeyboard: true,
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        lazy: false,
        freezeOnBlur: true,
        animation: 'shift',
        transitionSpec: TAB_TRANSITION,
      }}
    >
      <AdminTab.Screen
        name="Home"
        children={() => <FrozenTabScreen label="Home" />}
        listeners={frozenListeners}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />, tabBarLabel: 'Home' }}
      />
      <AdminTab.Screen
        name="Calendar"
        component={RoomsListScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} />, tabBarLabel: 'Calendar' }}
      />
      <AdminTab.Screen
        name="Settings"
        children={() => <FrozenTabScreen label="Settings" />}
        listeners={frozenListeners}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />, tabBarLabel: 'Settings' }}
      />
      <AdminTab.Screen
        name="Profile"
        children={() => <FrozenTabScreen label="Profile" />}
        listeners={frozenListeners}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} />, tabBarLabel: 'Profile' }}
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
      screenOptions={{
        headerShadowVisible: false,
        headerTitleAlign: 'left',
        animation: 'slide_from_right',
        animationDuration: 220,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        contentStyle: { backgroundColor: colors.background },
      }}
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
        options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade', animationDuration: 180 }}
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
      <AuthStack.Navigator
        id="AuthStack"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 180,
          contentStyle: { backgroundColor: colors.card },
        }}
      >
        <AuthStack.Screen name="Login" component={LoginScreen} />
      </AuthStack.Navigator>
    );
  }

  return <AppNavigator />;
}
