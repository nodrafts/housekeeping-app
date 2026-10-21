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
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '../components/ui/BrandLogo';
import { TopSafeArea } from '../components/layout/Screen';
import { colors, radii } from '../lib/theme';
import { useAuth } from '../modules/auth/useAuth';
import { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

function PasswordField({
  label,
  placeholder,
  value,
  onChangeText,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ marginTop: 18 }}>
      <Text style={{ marginBottom: 9, fontSize: 13, fontWeight: '700', color: colors.foreground }}>{label}</Text>
      <View style={{ height: 54, flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          style={{ flex: 1, height: 52, paddingHorizontal: 16, color: colors.foreground, fontSize: 15 }}
        />
        <TouchableOpacity
          onPress={() => setVisible((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel={t(visible ? 'auth.hide' : 'auth.show')}
          style={{ minWidth: 58, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 12, color: colors.foreground }}>{t(visible ? 'auth.hide' : 'auth.show')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function ForgotPasswordScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const {
    loading,
    error,
    passwordChangeEmail,
    startPasswordChange,
    finishPasswordChange,
    cancelPasswordChange,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const isCreatingPassword = Boolean(passwordChangeEmail);

  const submitTemporaryPassword = async () => {
    if (!email.trim() || !temporaryPassword) {
      setValidationError(t('auth.requiredResetFields'));
      return;
    }
    setValidationError(null);
    try {
      await startPasswordChange({ email, password: temporaryPassword });
    } catch {
      // AuthProvider exposes the user-facing failure state.
    }
  };

  const submitNewPassword = async () => {
    if (newPassword.length < 8) {
      setValidationError(t('auth.passwordRule'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setValidationError(t('auth.passwordMismatch'));
      return;
    }
    setValidationError(null);
    try {
      await finishPasswordChange(newPassword);
    } catch {
      // AuthProvider exposes the user-facing failure state.
    }
  };

  const authError = error === 'INVALID_TEMPORARY_CREDENTIALS'
    ? t('auth.invalidTemporaryCredentials')
    : error === 'TEMPORARY_PASSWORD_NOT_REQUIRED'
      ? t('auth.temporaryPasswordNotRequired')
      : error === 'PASSWORD_CHANGE_FAILED' || error === 'PASSWORD_CHANGE_SESSION_EXPIRED'
        ? t('auth.passwordChangeFailed')
        : null;

  const goBack = () => {
    if (isCreatingPassword) {
      cancelPasswordChange();
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#201f20' }} edges={['bottom']}>
      <TopSafeArea color={colors.primary} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
          style={{ width: '100%', maxWidth: 430, alignSelf: 'center', backgroundColor: colors.primary }}
        >
          <View style={{ minHeight: 238, paddingHorizontal: 26, paddingTop: 24, paddingBottom: 50, overflow: 'hidden' }}>
            <View pointerEvents="none" style={{ position: 'absolute', width: 154, height: 154, right: -54, top: -76, borderRadius: 77, borderWidth: 30, borderColor: 'rgba(255,255,255,0.10)' }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <BrandLogo width={42} height={28} color={colors.primaryForeground} />
              <Text style={{ color: colors.primaryForeground, fontSize: 22, fontWeight: '800' }}>noDrafts</Text>
            </View>
            <Text style={{ marginTop: 32, color: colors.primaryForeground, fontSize: 30, lineHeight: 35, fontWeight: '800' }}>
              {isCreatingPassword ? t('auth.createNewPassword') : t('auth.resetPassword')}
            </Text>
            <Text style={{ marginTop: 8, color: colors.primaryForeground, fontSize: 14, lineHeight: 20 }}>
              {isCreatingPassword ? passwordChangeEmail : t('auth.resetInstructions')}
            </Text>
          </View>

          <View style={{ flex: 1, marginTop: -28, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: colors.card, paddingHorizontal: 26, paddingTop: 28, paddingBottom: 28 }}>
            {!isCreatingPassword ? (
              <>
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
                <PasswordField
                  label={t('auth.temporaryPassword')}
                  placeholder={t('auth.temporaryPasswordPlaceholder')}
                  value={temporaryPassword}
                  onChangeText={setTemporaryPassword}
                />
              </>
            ) : (
              <>
                <PasswordField
                  label={t('auth.newPassword')}
                  placeholder={t('auth.newPasswordPlaceholder')}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <Text style={{ marginTop: 7, color: colors.mutedForeground, fontSize: 12 }}>{t('auth.passwordRule')}</Text>
                <PasswordField
                  label={t('auth.confirmPassword')}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </>
            )}

            {validationError || authError ? (
              <Text accessibilityRole="alert" style={{ marginTop: 14, color: colors.destructive, fontSize: 13, fontWeight: '600', lineHeight: 18 }}>
                {validationError ?? authError}
              </Text>
            ) : null}

            <TouchableOpacity
              onPress={isCreatingPassword ? submitNewPassword : submitTemporaryPassword}
              disabled={loading}
              accessibilityRole="button"
              style={{ marginTop: 20, minHeight: 52, borderRadius: radii.lg, flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, opacity: loading ? 0.55 : 1 }}
            >
              <Text style={{ color: colors.primaryForeground, fontSize: 14, fontWeight: '800' }}>
                {isCreatingPassword
                  ? loading ? t('auth.savingNewPassword') : t('auth.saveNewPassword')
                  : loading ? t('auth.verifyingTemporaryPassword') : t('auth.verifyTemporaryPassword')}
              </Text>
              {!loading ? <Text style={{ color: colors.primaryForeground, fontSize: 24, lineHeight: 24 }}>›</Text> : null}
            </TouchableOpacity>

            <TouchableOpacity onPress={goBack} accessibilityRole="button" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>{t('auth.backToLogin')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
