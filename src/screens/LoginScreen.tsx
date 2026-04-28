import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../modules/auth/useAuth';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({}: Props) {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // For now this will call the real login endpoint if configured,
    // otherwise you can later swap to a mocked implementation.
    login({ email, password });
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
        paddingHorizontal: 24,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Centered card */}
      <View
        style={{
          width: '100%',
          maxWidth: 420,
          paddingHorizontal: 32,
          paddingVertical: 36,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          backgroundColor: '#ffffff',
          // Android shadow
          elevation: 3,
          // iOS shadow (no-op on Android but harmless)
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        {/* Logo + product name */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: '700' }}>No Drafts</Text>
        </View>

        {/* Heading + subtitle */}
        <Text style={{ fontSize: 24, fontWeight: '600', marginBottom: 8 }}>
          Sign in
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: '#6b7280',
            marginBottom: 24,
          }}
        >
          Enter your email and password below to log into your account.
        </Text>

        {/* Email */}
        <Text style={{ fontSize: 14, marginBottom: 4 }}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor="#9ca3af"
          style={{
            height: 44,
            paddingHorizontal: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#d1d5db',
            backgroundColor: '#ffffff',
          }}
        />

        {/* Password */}
        <Text style={{ fontSize: 14, marginTop: 16, marginBottom: 4 }}>
          Password
        </Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="#9ca3af"
          style={{
            height: 44,
            paddingHorizontal: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#d1d5db',
            backgroundColor: '#ffffff',
          }}
        />

        {error ? (
          <Text style={{ color: '#b91c1c', marginTop: 8 }}>{error}</Text>
        ) : null}

        {/* Primary button */}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={{
            marginTop: 24,
            height: 44,
            borderRadius: 9999,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: loading ? '#93c5fd' : '#2563eb',
          }}
        >
          <Text style={{ color: '#ffffff', fontWeight: '600' }}>
            {loading ? 'Signing in…' : 'Continue'}
          </Text>
        </TouchableOpacity>

        {/* Terms text */}
        <Text
          style={{
            marginTop: 16,
            fontSize: 12,
            color: '#6b7280',
            textAlign: 'center',
          }}
        >
          By clicking continue, you agree to our Terms of Service and Privacy
          Policy.
        </Text>
      </View>
    </View>
  );
}

