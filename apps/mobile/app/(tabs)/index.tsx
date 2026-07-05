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
import { Link } from 'expo-router';
import * as Location from 'expo-location';

import { ScreenContainer } from '@/components/screen-container';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { trpcQuery, trpcMutation } from '@/lib/api';

type ScheduleItem = {
  job: {
    id: string;
    title: string;
    stage: string;
    scheduledStart: string | null;
  };
  property: {
    addressLine1: string;
    city: string;
    state: string;
  };
  customer: {
    firstName: string;
    lastName: string;
    phone: string | null;
  };
};

export default function CrewHomeScreen() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const { isTablet, scheduleColumns } = useResponsiveLayout();

  useEffect(() => {
    loadSchedule();
    loadActiveClock();
  }, []);

  async function loadActiveClock() {
    try {
      const active = await trpcQuery('crew.getActiveClockIn');
      setActiveEntryId(active?.id ?? null);
    } catch {
      // Non-fatal if clock status cannot load
    }
  }

  async function loadSchedule() {
    try {
      const data = await trpcQuery('crew.mySchedule', { date: new Date().toISOString() });
      setSchedule(data ?? []);
    } catch {
      Alert.alert('Error', 'Could not load schedule. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  async function clockIn(jobId: string) {
    const { status } = await Location.requestForegroundPermissionsAsync();
    let latitude: number | undefined;
    let longitude: number | undefined;
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({});
      latitude = loc.coords.latitude;
      longitude = loc.coords.longitude;
    }

    const entry = await trpcMutation('crew.clockIn', {
      jobId,
      clockIn: new Date().toISOString(),
      latitude,
      longitude,
    });
    setActiveEntryId(entry?.id ?? null);
    Alert.alert('Clocked in', 'Time tracking started.');
  }

  async function clockOut() {
    if (!activeEntryId) return;
    await trpcMutation('crew.clockOut', { entryId: activeEntryId });
    setActiveEntryId(null);
    Alert.alert('Clocked out', 'Time entry saved.');
  }

  async function completeJob(jobId: string) {
    Alert.alert(
      'Marketing sign',
      'Did crew place a marketing sign at this job?',
      [
        {
          text: 'No',
          style: 'cancel',
          onPress: async () => {
            await trpcMutation('crew.completeJob', { jobId });
            Alert.alert('Complete', 'Job marked as installed.');
            loadSchedule();
          },
        },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const { status } = await Location.requestForegroundPermissionsAsync();
              let latitude: number | undefined;
              let longitude: number | undefined;
              if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                latitude = loc.coords.latitude;
                longitude = loc.coords.longitude;
              }
              await trpcMutation('crew.completeJob', { jobId });
              await trpcMutation('signTracker360.createFromJob', {
                jobId,
                quantityPlaced: 1,
                placementType: 'customer_yard',
                latitude,
                longitude,
              });
              Alert.alert('Complete', 'Job completed and sign location recorded.');
              loadSchedule();
            } catch {
              Alert.alert('Error', 'Job completed but sign location could not be saved.');
              loadSchedule();
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color="#DC2626" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <FlatList
        data={schedule}
        key={scheduleColumns}
        numColumns={scheduleColumns}
        keyExtractor={(item) => item.job.id}
        columnWrapperStyle={scheduleColumns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>No jobs scheduled for today.</Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, scheduleColumns > 1 && styles.cardGrid]}>
            <Text style={[styles.title, isTablet && styles.titleTablet]}>{item.job.title}</Text>
            <Text style={styles.subtitle}>
              {item.customer.firstName} {item.customer.lastName}
            </Text>
            <Text style={styles.address}>
              {item.property.addressLine1}, {item.property.city}, {item.property.state}
            </Text>
            {item.job.scheduledStart && (
              <Text style={styles.time}>
                {new Date(item.job.scheduledStart).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            )}
            <View style={[styles.actions, isTablet && styles.actionsTablet]}>
              <TouchableOpacity style={styles.btnOutline} onPress={() => clockIn(item.job.id)}>
                <Text style={styles.btnOutlineText}>Clock in</Text>
              </TouchableOpacity>
              {activeEntryId && (
                <TouchableOpacity style={styles.btnOutline} onPress={clockOut}>
                  <Text style={styles.btnOutlineText}>Clock out</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => completeJob(item.job.id)}
              >
                <Text style={styles.btnPrimaryText}>Complete</Text>
              </TouchableOpacity>
              <Link href={`/job/${item.job.id}`} asChild>
                <TouchableOpacity style={styles.btnOutline}>
                  <Text style={styles.btnOutlineText}>Details</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 24 },
  empty: { textAlign: 'center', color: '#64748B', marginTop: 40, fontSize: 16 },
  columnWrapper: { gap: 16 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardGrid: { flex: 1, marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  titleTablet: { fontSize: 18 },
  subtitle: { fontSize: 14, color: '#475569', marginTop: 4 },
  address: { fontSize: 13, color: '#64748B', marginTop: 2 },
  time: { fontSize: 13, color: '#DC2626', marginTop: 8, fontWeight: '500' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionsTablet: { marginTop: 16, gap: 10 },
  btnPrimary: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  btnPrimaryText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  btnOutline: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  btnOutlineText: { color: '#475569', fontSize: 14, fontWeight: '500' },
});
