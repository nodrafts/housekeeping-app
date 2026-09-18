import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';

interface Props {
  children: React.ReactNode;
  showMessagesButton?: boolean; // kept for API compat, no longer renders FAB
}

export function Screen({ children }: Props) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaView>
  );
}
