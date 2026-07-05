import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        tabBarActiveTintColor: '#DC2626',
        tabBarStyle: { paddingBottom: 4, height: 56 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Jobs', headerTitle: "Today's schedule" }} />
      <Tabs.Screen name="signs" options={{ title: 'Signs', headerTitle: 'Sign pickup' }} />
    </Tabs>
  );
}
