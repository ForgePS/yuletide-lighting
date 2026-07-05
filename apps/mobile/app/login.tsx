import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Redirect } from 'expo-router';

import { ScreenContainer } from '@/components/screen-container';
import { useAuth } from '@/hooks/use-auth';

export default function LoginScreen() {
  const { ready, signedIn, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!ready) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color="#DC2626" />
      </ScreenContainer>
    );
  }

  if (signedIn) {
    return <Redirect href="/(tabs)" />;
  }

  async function handleSignIn() {
    setError('');
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.formWrap}
      >
        <Text style={styles.title}>Yuletide Lighting Crew</Text>
        <Text style={styles.subtitle}>Sign in to view your schedule and signs</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput
          secureTextEntry
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />
        <TouchableOpacity
          style={[styles.btnPrimary, busy && styles.btnDisabled]}
          onPress={handleSignIn}
          disabled={busy || !email.trim() || !password}
        >
          {busy ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnPrimaryText}>Sign in</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  formWrap: { flex: 1, justifyContent: 'center', gap: 12, maxWidth: 420, width: '100%', alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 15, color: '#64748B', marginBottom: 8 },
  error: { color: '#DC2626', fontSize: 14, backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  btnPrimary: {
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.7 },
  btnPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
