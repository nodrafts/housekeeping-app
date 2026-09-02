import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthStackParamList, AppStackParamList, StaffTabParamList, AdminTabParamList } from './types';
import { LoginScreen } from '../screens/LoginScreen';
import { RoomsListScreen } from '../screens/RoomsListScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RoomDetailsScreen } from '../screens/RoomDetailsScreen';
import { ReportIssueScreen } from '../screens/ReportIssueScreen';
import { HotelSelectScreen } from '../screens/HotelSelectScreen';
import { useAuth } from '../modules/auth/useAuth';
import { useRole } from '../modules/auth/useRole';
import { useHotelStore } from '../modules/hotel/useHotelStore';
import { DEFAULT_HOTEL_CODE } from '../lib/propertyConfig';
import { colors } from '../lib/theme';
import { Icon, IconName } from '../components/ui/Icon';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useTranslation } from 'react-i18next';
import { OrganizationSelectScreen } from '../screens/OrganizationSelectScreen';

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

function StaffTabNavigator() {
  const { t } = useTranslation();
  return (
    <StaffTab.Navigator
      id="StaffTabs"
      initialRouteName="Housekeeping"
      screenOptions={{
        tabBarStyle: TAB_BAR_STYLE,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
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
        name="Housekeeping"
        component={RoomsListScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="bed" focused={focused} />, tabBarLabel: t('navigation.housekeeping') }}
      />
      <StaffTab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} />, tabBarLabel: t('navigation.schedule') }}
      />
      <StaffTab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />, tabBarLabel: t('navigation.settings') }}
      />
      <StaffTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} />, tabBarLabel: t('navigation.profile') }}
      />
    </StaffTab.Navigator>
  );
}

function AdminTabNavigator() {
  const { t } = useTranslation();
  return (
    <AdminTab.Navigator
      id="AdminTabs"
      initialRouteName="Housekeeping"
      screenOptions={{
        tabBarStyle: TAB_BAR_STYLE,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
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
        name="Housekeeping"
        component={RoomsListScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="bed" focused={focused} />, tabBarLabel: t('navigation.housekeeping') }}
      />
      <AdminTab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} />, tabBarLabel: t('navigation.schedule') }}
      />
      <AdminTab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />, tabBarLabel: t('navigation.settings') }}
      />
      <AdminTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} />, tabBarLabel: t('navigation.profile') }}
      />
    </AdminTab.Navigator>
  );
}

function AppNavigator() {
  const { t } = useTranslation();
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
        options={{ title: t('navigation.roomDetails') }}
      />
      <AppStack.Screen
        name="RoomsList"
        component={RoomsListScreen}
        options={{ title: t('navigation.housekeeping') }}
      />
      <AppStack.Screen
        name="HotelSelect"
        component={HotelSelectScreen}
        options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade', animationDuration: 180 }}
      />
      <AppStack.Screen
        name="ReportIssue"
        component={ReportIssueScreen}
        options={{ title: t('navigation.reportIssue') }}
      />
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading, requiresOrganizationSelection } = useAuth();

  if (loading) return null;

  if (requiresOrganizationSelection) {
    return (
      <AuthStack.Navigator
        id="OrganizationAuthStack"
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        <AuthStack.Screen name="OrganizationSelect" component={OrganizationSelectScreen} />
      </AuthStack.Navigator>
    );
  }

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
