import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '../components/ui/BrandLogo';
import { colors, radii } from '../lib/theme';
import { useAuth } from '../modules/auth/useAuth';
import { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({}: Props) {
  const { t } = useTranslation();
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => login({ email, password });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#201f20' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
          style={{ width: '100%', maxWidth: 430, alignSelf: 'center', backgroundColor: colors.primary }}
        >
          <View style={{ minHeight: 274, paddingHorizontal: 26, paddingTop: 24, paddingBottom: 50, overflow: 'hidden' }}>
            <View pointerEvents="none" style={{ position: 'absolute', width: 154, height: 154, right: -54, top: -76, borderRadius: 77, borderWidth: 30, borderColor: 'rgba(255,255,255,0.10)' }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <BrandLogo width={42} height={28} color={colors.primaryForeground} />
              <Text style={{ color: colors.primaryForeground, fontSize: 22, fontWeight: '800' }}>noDrafts</Text>
            </View>

            <View style={{ marginTop: 32 }}>
              <Text style={{ color: colors.primaryForeground, fontSize: 11, fontWeight: '800' }}>{t('auth.brandTagline')}</Text>
              <Text style={{ marginTop: 10, color: colors.primaryForeground, fontSize: 30, lineHeight: 35, fontWeight: '800' }}>{t('auth.welcome')}.</Text>
              <Text style={{ marginTop: 8, color: colors.primaryForeground, fontSize: 14 }}>{t('auth.startShift')}</Text>
            </View>
          </View>

          <View style={{ flex: 1, marginTop: -28, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: colors.card, paddingHorizontal: 26, paddingTop: 28, paddingBottom: 28 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground, marginBottom: 9 }}>{t('auth.workEmail')}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor={colors.mutedForeground}
              style={{ height: 54, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground, fontSize: 15 }}
            />

            <Text style={{ marginTop: 20, marginBottom: 9, fontSize: 13, fontWeight: '700', color: colors.foreground }}>{t('auth.password')}</Text>
            <View style={{ height: 54, flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="current-password"
                placeholder={t('auth.passwordPlaceholder')}
                placeholderTextColor={colors.mutedForeground}
                style={{ flex: 1, height: 52, paddingHorizontal: 16, color: colors.foreground, fontSize: 15 }}
              />
              <TouchableOpacity onPress={() => setShowPassword((current) => !current)} style={{ minWidth: 58, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 12, color: colors.foreground }}>{t(showPassword ? 'auth.hide' : 'auth.show')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => Alert.alert(t('auth.needHelp'), t('auth.helpMessage'))} style={{ alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ fontSize: 12, color: colors.foreground, textDecorationLine: 'underline' }}>{t('auth.needHelp')}</Text>
            </TouchableOpacity>

            {error ? <Text style={{ marginBottom: 10, color: colors.destructive, fontSize: 13, fontWeight: '600' }}>{t('auth.invalid')}</Text> : null}

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={{ minHeight: 52, borderRadius: radii.lg, flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, opacity: loading ? 0.55 : 1 }}
            >
              <Text style={{ color: colors.primaryForeground, fontSize: 14, fontWeight: '800' }}>{loading ? t('auth.signingIn') : t('auth.login')}</Text>
              <Text style={{ color: colors.primaryForeground, fontSize: 24, lineHeight: 24 }}>›</Text>
            </TouchableOpacity>

            <View style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 20 }}>
              <Text style={{ textAlign: 'center', color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>{t('auth.loginFooter')}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
