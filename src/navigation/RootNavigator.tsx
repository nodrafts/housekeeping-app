import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthStackParamList, AppStackParamList, StaffTabParamList, AdminTabParamList } from './types';
import { LoginScreen } from '../screens/LoginScreen';
import { RoomsListScreen } from '../screens/RoomsListScreen';
import { RoomDetailsScreen } from '../screens/RoomDetailsScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ReportIssueScreen } from '../screens/ReportIssueScreen';
import { HotelSelectScreen } from '../screens/HotelSelectScreen';
import { MessagingScreen } from '../screens/MessagingScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useAuth } from '../modules/auth/useAuth';
import { useRole } from '../modules/auth/useRole';
import { useHotelStore } from '../modules/hotel/useHotelStore';
import { useMessages } from '../modules/chat/useMessages';
import { useUnreadCount } from '../modules/chat/useUnreadCount';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const StaffTab = createBottomTabNavigator<StaffTabParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
  );
}

function MessagesTabIcon({ focused }: { focused: boolean }) {
  const { data: messages = [] } = useMessages('housekeeping-maintenance', 50);
  const unread = useUnreadCount(messages);
  return (
    <View>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>💬</Text>
      {unread > 0 && (
        <View style={{
          position: 'absolute', top: -4, right: -6,
          minWidth: 16, height: 16, borderRadius: 8,
          backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#ffffff',
        }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: '#ffffff' }}>
            {unread > 99 ? '99+' : unread}
          </Text>
        </View>
      )}
    </View>
  );
}

const TAB_BAR_STYLE = {
  backgroundColor: '#1e3a5f',
  borderTopColor: '#f97316',
  borderTopWidth: 2,
  height: 64,
  paddingBottom: 10,
  paddingTop: 8,
};

const TAB_SCREEN_OPTIONS = {
  headerShadowVisible: false,
  headerTitleAlign: 'left' as const,
};

function StaffTabNavigator() {
  return (
    <StaffTab.Navigator
      screenOptions={{ tabBarStyle: TAB_BAR_STYLE, tabBarActiveTintColor: '#f97316', tabBarInactiveTintColor: '#93c5fd', headerShown: false }}
    >
      <StaffTab.Screen
        name="Home"
        component={RoomsListScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />, tabBarLabel: 'Home' }}
      />
      <StaffTab.Screen
        name="Messages"
        component={MessagingScreen}
        options={{ tabBarIcon: ({ focused }) => <MessagesTabIcon focused={focused} />, tabBarLabel: 'Messages' }}
      />
      <StaffTab.Screen
        name="Profile"
        component={DashboardScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />, tabBarLabel: 'Profile' }}
      />
      <StaffTab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} />, tabBarLabel: 'Settings' }}
      />
    </StaffTab.Navigator>
  );
}

function AdminTabNavigator() {
  return (
    <AdminTab.Navigator
      screenOptions={{ tabBarStyle: TAB_BAR_STYLE, tabBarActiveTintColor: '#f97316', tabBarInactiveTintColor: '#93c5fd', headerShown: false }}
    >
      <AdminTab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} />, tabBarLabel: 'Dashboard' }}
      />
      <AdminTab.Screen
        name="Rooms"
        component={RoomsListScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🏨" focused={focused} />, tabBarLabel: 'Rooms' }}
      />
      <AdminTab.Screen
        name="Messages"
        component={MessagingScreen}
        options={{ tabBarIcon: ({ focused }) => <MessagesTabIcon focused={focused} />, tabBarLabel: 'Messages' }}
      />
      <AdminTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />, tabBarLabel: 'Profile' }}
      />
      <AdminTab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} />, tabBarLabel: 'Settings' }}
      />
    </AdminTab.Navigator>
  );
}

function AppNavigator() {
  const { isAdmin, isStaff } = useRole();
  const { user } = useAuth();
  const { selectedHotel, setSelectedHotel } = useHotelStore();

  // Auto-assign hotel for staff from their user profile
  useEffect(() => {
    if (isStaff && user?.hotelCode && !selectedHotel) {
      setSelectedHotel({
        hotelCode: user.hotelCode,
        name: user.hotelName ?? user.hotelCode,
      });
    }
  }, [isStaff, user, selectedHotel]);

  return (
    <AppStack.Navigator screenOptions={{ headerShadowVisible: false, headerTitleAlign: 'left' }}>
      {/* Admin sees hotel select first; staff skips it */}
      {isAdmin && !selectedHotel && (
        <AppStack.Screen
          name="HotelSelect"
          component={HotelSelectScreen}
          options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade' }}
        />
      )}
      <AppStack.Screen
        name={isAdmin ? 'AdminTabs' : 'StaffTabs'}
        component={isAdmin ? AdminTabNavigator : StaffTabNavigator}
        options={{ headerShown: false }}
      />
      <AppStack.Screen
        name="RoomDetails"
        component={RoomDetailsScreen}
        options={{ title: 'Room details' }}
      />
      {isAdmin && (
        <AppStack.Screen
          name="HotelSelect"
          component={HotelSelectScreen}
          options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade' }}
        />
      )}
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
      <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login" component={LoginScreen} />
      </AuthStack.Navigator>
    );
  }

  return <AppNavigator />;
}
