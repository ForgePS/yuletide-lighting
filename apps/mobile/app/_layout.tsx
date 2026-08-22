import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerLargeTitle: Platform.OS === 'ios',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#F8FAFC' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Yuletide Lighting Crew' }} />
        <Stack.Screen name="login" options={{ title: 'Sign in', headerShown: false }} />
        <Stack.Screen name="job/[id]" options={{ title: 'Job Details' }} />
        <Stack.Screen name="(tabs)/signs" options={{ title: 'Sign pickup' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
