import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthProvider } from './src/modules/auth/AuthProvider';
import { queryClient } from './src/lib/queryClient';

import { HotelProvider } from './src/modules/hotel/useHotelStore';
import { loadAppLanguage } from './src/i18n';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  useEffect(() => {
    loadAppLanguage().catch(() => undefined);
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <HotelProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </HotelProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
