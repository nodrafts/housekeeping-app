import React from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';

interface Props {
  children: React.ReactNode;
  showMessagesButton?: boolean; // kept for API compat, no longer renders FAB
}

export function Screen({ children }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const webMobileFallback = Platform.OS === 'web' && width <= 768 ? 48 : 0;
  const topInset = Math.max(insets.top, webMobileFallback);

  return (
    <View style={{ flex: 1, paddingTop: topInset, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}
