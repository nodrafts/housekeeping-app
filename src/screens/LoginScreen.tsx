import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../modules/auth/useAuth';
import { colors, radii } from '../lib/theme';
import { useTranslation } from 'react-i18next';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

function LogoMark() {
  return (
    <View style={{ width: 38, height: 28, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 7, height: 22, borderRadius: 2, backgroundColor: colors.primaryForeground }} />
      <View style={{ marginLeft: 3, gap: 4 }}>
        <View style={{ width: 7, height: 5, borderRadius: 1.5, backgroundColor: colors.primaryForeground }} />
        <View style={{ width: 7, height: 5, borderRadius: 1.5, backgroundColor: colors.primaryForeground }} />
        <View style={{ width: 7, height: 5, borderRadius: 1.5, backgroundColor: colors.primaryForeground }} />
      </View>
      <View
        style={{
          marginLeft: 4,
          width: 17,
          height: 22,
          borderTopRightRadius: 11,
          borderBottomRightRadius: 11,
          borderWidth: 5,
          borderLeftWidth: 0,
          borderColor: colors.primaryForeground,
        }}
      />
    </View>
  );
}

export function LoginScreen({}: Props) {
  const { t } = useTranslation();
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    login({ email, password });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.primary }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'flex-end',
            paddingHorizontal: 24,
            paddingTop: 56,
            paddingBottom: 24,
          }}
        >
          <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center' }}>
            <View style={{ alignItems: 'flex-start', marginBottom: 38 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <LogoMark />
                <Text style={{ marginLeft: 10, fontSize: 28, fontWeight: '800', color: colors.primaryForeground }}>
                  noDrafts
                </Text>
              </View>
              <Text style={{ marginTop: 10, fontSize: 17, fontWeight: '600', color: '#eadfea' }}>
                {t('navigation.housekeeping')}
              </Text>
            </View>

            <View
              style={{
                width: '100%',
                paddingHorizontal: 24,
                paddingVertical: 30,
                borderRadius: radii.xl,
                backgroundColor: colors.card,
                elevation: 6,
                shadowColor: '#000000',
                shadowOpacity: 0.18,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
              }}
            >
              <Text style={{ fontSize: 26, fontWeight: '800', color: colors.foreground, marginBottom: 8 }}>
                {t('auth.signIn')}
              </Text>
              <Text style={{ fontSize: 15, lineHeight: 22, color: colors.mutedForeground, marginBottom: 24 }}>
                {t('auth.subtitle')}
              </Text>

              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, marginBottom: 8 }}>
                {t('auth.email')}
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="name@example.com"
                placeholderTextColor={colors.mutedForeground}
                style={{
                  height: 48,
                  paddingHorizontal: 14,
                  borderRadius: radii.sm,
                  borderWidth: 1,
                  borderColor: colors.input,
                  backgroundColor: colors.card,
                  color: colors.foreground,
                  fontSize: 15,
                }}
              />

              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, marginTop: 16, marginBottom: 8 }}>
                {t('auth.password')}
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder={t('auth.password')}
                placeholderTextColor={colors.mutedForeground}
                style={{
                  height: 48,
                  paddingHorizontal: 14,
                  borderRadius: radii.sm,
                  borderWidth: 1,
                  borderColor: colors.input,
                  backgroundColor: colors.card,
                  color: colors.foreground,
                  fontSize: 15,
                }}
              />

              {error ? (
                <Text style={{ marginTop: 10, color: colors.destructive, fontSize: 13, fontWeight: '600' }}>
                  {t('auth.invalid')}
                </Text>
              ) : null}

              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                style={{
                  marginTop: 24,
                  height: 48,
                  borderRadius: radii.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primary,
                  opacity: loading ? 0.65 : 1,
                }}
              >
                <Text style={{ color: colors.primaryForeground, fontSize: 15, fontWeight: '800' }}>
                  {loading ? t('auth.signingIn') : t('common.continue')}
                </Text>
              </TouchableOpacity>

              <Text
                style={{
                  marginTop: 18,
                  paddingHorizontal: 8,
                  fontSize: 12,
                  lineHeight: 18,
                  color: colors.mutedForeground,
                  textAlign: 'center',
                }}
              >
                {t('auth.terms')}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
