import React from 'react';
import { SafeAreaView, View } from 'react-native';
import { colors } from '../../lib/theme';

interface Props {
  children: React.ReactNode;
  showMessagesButton?: boolean; // kept for API compat, no longer renders FAB
}

export function Screen({ children }: Props) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaView>
  );
}
