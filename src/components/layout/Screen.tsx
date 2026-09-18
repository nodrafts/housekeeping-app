import React from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';

interface Props {
  children: React.ReactNode;
  safeAreaColor?: string;
  showMessagesButton?: boolean; // kept for API compat, no longer renders FAB
}

export function TopSafeArea({ color = colors.card }: { color?: string }) {
  const insets = useSafeAreaInsets();
  // This is a phone-first web app. Browser device emulation can report the
  // desktop layout width, so a width media check is not reliable here.
  const webMobileFallback = Platform.OS === 'web' ? 48 : 0;
  const topInset = Math.max(insets.top, webMobileFallback);

  return <View testID="top-safe-area" style={{ height: topInset, flexShrink: 0, backgroundColor: color }} />;
}

export function Screen({ children, safeAreaColor = colors.card }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopSafeArea color={safeAreaColor} />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}
