import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthProvider } from './src/modules/auth/AuthProvider';
import { queryClient } from './src/lib/queryClient';

import { HotelProvider } from './src/modules/hotel/useHotelStore';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HotelProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </HotelProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}