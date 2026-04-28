import React from 'react';
import { SafeAreaView, View } from 'react-native';

interface Props {
  children: React.ReactNode;
  showMessagesButton?: boolean; // kept for API compat, no longer renders FAB
}

export function Screen({ children }: Props) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaView>
  );
}
