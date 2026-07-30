import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';

import { ScreenContainer } from '@/components/screen-container';
import { trpcQuery } from '@/lib/api';

type PickupLocation = {
  id: string;
  distanceMiles: number;
  location: {
    address?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    latitude: number;
    longitude: number;
  };
  signData: {
    quantityPlaced: number;
  };
};

function currentSeasonYear() {
  const now = new Date();
  return now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
}

export default function SignsPickupScreen() {
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<PickupLocation[]>([]);

  useEffect(() => {
    loadPickupRoute();
  }, []);

  async function loadPickupRoute() {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let latitude = 35;
      let longitude = -90;
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }

      const data = await trpcQuery('signTracker360.pickupRoute', {
        latitude,
        longitude,
        seasonYear: currentSeasonYear(),
      });
      setLocations(data ?? []);
    } catch {
      Alert.alert('Error', 'Could not load sign pickup route.');
    } finally {
      setLoading(false);
    }
  }

  function openMaps(item: PickupLocation) {
    const { latitude, longitude } = item.location;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    Linking.openURL(url);
  }

  if (loading) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Finding active signs near you…</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={styles.summary}>
        {locations.length} active sign {locations.length === 1 ? 'location' : 'locations'} — closest first
      </Text>
      <FlatList
        data={locations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No active signs to pick up</Text>
            <Text style={styles.emptyText}>Check back after installs add yard signs.</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <Text style={styles.rank}>#{index + 1}</Text>
            <Text style={styles.title}>
              {item.location.address || item.location.neighborhood || 'Sign location'}
            </Text>
            {item.location.city ? <Text style={styles.subtitle}>{item.location.city}</Text> : null}
            <Text style={styles.meta}>{item.signData.quantityPlaced} signs placed</Text>
            <View style={styles.row}>
              <Text style={styles.distance}>{item.distanceMiles.toFixed(1)} mi</Text>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => openMaps(item)}>
                <Text style={styles.btnPrimaryText}>Navigate</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#64748B', fontSize: 14 },
  summary: { fontSize: 14, color: '#64748B', marginBottom: 12 },
  listContent: { paddingBottom: 24 },
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  emptyText: { fontSize: 14, color: '#64748B', marginTop: 8, textAlign: 'center' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rank: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginTop: 4 },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 2 },
  meta: { fontSize: 13, color: '#475569', marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  distance: { fontSize: 18, fontWeight: '700', color: '#DC2626' },
  btnPrimary: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnPrimaryText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
});
