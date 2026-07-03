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
        <Stack.Screen name="job/[id]" options={{ title: 'Job Details' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
