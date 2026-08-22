import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ScreenContainer } from '@/components/screen-container';
import { getFirebaseAuth } from '@/lib/firebase';
import { setAuthToken } from '@/lib/api';

export default function CrewLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSignIn() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) {
      Alert.alert('Sign in', 'Enter email and password.');
      return;
    }
    setBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(getFirebaseAuth(), trimmed, password);
      const idToken = await cred.user.getIdToken(true);
      await setAuthToken(idToken);
      router.replace('/');
    } catch (err) {
      const message =
        err instanceof Error && /auth\//.test(err.message)
          ? 'Invalid email or password.'
          : 'Could not sign in. Check your connection and try again.';
      Alert.alert('Sign in failed', message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <Text style={styles.heading}>Crew sign in</Text>
        <Text style={styles.sub}>
          Use the same email and password as your staff account (invited by an admin).
        </Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          editable={!busy}
        />
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          editable={!busy}
        />
        <TouchableOpacity
          style={[styles.btn, busy && styles.btnDisabled]}
          onPress={onSignIn}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Sign in</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { justifyContent: 'center' },
  inner: { gap: 12, paddingHorizontal: 8 },
  heading: { fontSize: 24, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  btn: {
    marginTop: 8,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
