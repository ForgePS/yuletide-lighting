import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { JobPhotoCapture } from '@/components/job-photo-capture';
import { ScreenContainer } from '@/components/screen-container';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { trpcQuery, trpcMutation } from '@/lib/api';

type JobDetail = {
  job: { id: string; title: string; stage: string };
  customer: { firstName: string; lastName: string; phone?: string | null };
  property: { addressLine1: string; city: string; state: string; installNotes?: string | null };
  checklist: Array<{ id: string; label: string; done: boolean }>;
  materials: Array<{ id: string; name: string; quantity: number }>;
};

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isTablet, isLandscape, sectionGap } = useResponsiveLayout();
  const twoColumn = isTablet && isLandscape;
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueNotes, setIssueNotes] = useState('');

  useEffect(() => {
    if (!id) return;
    trpcQuery('crew.getJob', { jobId: id })
      .then(setDetail)
      .catch(() => Alert.alert('Error', 'Could not load job details.'));
  }, [id]);

  async function reportIssue() {
    if (!id || !issueTitle.trim()) return;
    await trpcMutation('crew.reportIssue', {
      jobId: id,
      title: issueTitle.trim(),
      description: issueNotes.trim() || issueTitle.trim(),
      priority: 'normal',
      category: 'other',
    });
    Alert.alert('Reported', 'Service issue submitted.');
    setIssueTitle('');
    setIssueNotes('');
  }

  async function markCustomerNotHome() {
    if (!id) return;
    await trpcMutation('crew.customerNotHome', { jobId: id, notes: 'Customer not home at scheduled time' });
    Alert.alert('Logged', 'Customer not home note saved.');
  }

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { gap: sectionGap, paddingBottom: 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.heading, isTablet && styles.headingTablet]}>
          {detail?.job.title ?? `Job #${id?.slice(0, 8)}`}
        </Text>
        {detail?.property && (
          <Text style={styles.subheading}>
            {detail.property.addressLine1}, {detail.property.city}, {detail.property.state}
          </Text>
        )}

        <View style={[styles.body, twoColumn && styles.bodyLandscape]}>
          <View style={[styles.section, twoColumn && styles.column]}>
            <Text style={styles.sectionTitle}>Checklist</Text>
            {detail?.checklist.map((item) => (
              <View key={item.id} style={styles.checkRow}>
                <Text style={[styles.checkMark, item.done && styles.checkDone]}>{item.done ? '✓' : '○'}</Text>
                <Text style={styles.text}>{item.label}</Text>
              </View>
            )) ?? <Text style={styles.text}>Loading checklist…</Text>}

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Install photos</Text>
            {id ? <JobPhotoCapture jobId={id} /> : null}
          </View>

          <View style={[styles.sideStack, twoColumn && styles.column]}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Materials</Text>
              {detail?.materials.length ? detail.materials.map((m) => (
                <Text key={m.id} style={styles.text}>• {m.name} ×{m.quantity}</Text>
              )) : (
                <Text style={styles.text}>Material pick list loads from job reservation.</Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Report issue</Text>
              <TextInput placeholder="Issue title" value={issueTitle} onChangeText={setIssueTitle} style={styles.input} />
              <TextInput placeholder="Details" value={issueNotes} onChangeText={setIssueNotes} style={[styles.input, styles.textArea]} multiline />
              <TouchableOpacity style={styles.btnOutline} onPress={reportIssue}>
                <Text style={styles.btnOutlineText}>Submit issue</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnOutline} onPress={markCustomerNotHome}>
                <Text style={styles.btnOutlineText}>Customer not home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 8 },
  content: { flexGrow: 1 },
  heading: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  headingTablet: { fontSize: 28 },
  subheading: { fontSize: 14, color: '#64748B', marginTop: 4 },
  body: { gap: 12 },
  bodyLandscape: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { flex: 1 },
  sideStack: { gap: 12 },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  text: { fontSize: 15, color: '#64748B', lineHeight: 22 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkMark: { fontSize: 16, color: '#94A3B8', width: 20 },
  checkDone: { color: '#16A34A' },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#FFF',
  },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  btnOutline: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnOutlineText: { color: '#475569', fontWeight: '600', fontSize: 14 },
});
