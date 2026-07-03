import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { uploadJobPhoto } from '@/lib/upload';
import { trpcMutation } from '@/lib/api';

export function JobPhotoCapture({ jobId, onUploaded }: { jobId: string; onUploaded?: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { isTablet, isLandscape, photoPreviewHeight } = useResponsiveLayout();

  const upload = useCallback(
    async (uri: string) => {
      setUploading(true);
      try {
        const path = await uploadJobPhoto(uri, jobId);
        await trpcMutation('crew.uploadPhoto', { jobId, url: path, photoType: 'during' });
        Alert.alert('Uploaded', 'Install photo saved to this job.');
        onUploaded?.();
      } catch (err) {
        Alert.alert(
          'Upload failed',
          err instanceof Error
            ? err.message
            : 'Could not upload photo. Sign in on web first to sync your session token.',
        );
        setPreview(null);
      } finally {
        setUploading(false);
      }
    },
    [jobId, onUploaded],
  );

  const pickFromCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Enable camera access in Settings to take install photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setPreview(result.assets[0].uri);
      await upload(result.assets[0].uri);
    }
  }, [upload]);

  const pickFromLibrary = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photos access needed', 'Enable photo library access to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      setPreview(result.assets[0].uri);
      await upload(result.assets[0].uri);
    }
  }, [upload]);

  return (
    <View style={styles.wrap}>
      {preview ? (
        <Image
          source={{ uri: preview }}
          style={[styles.preview, { height: photoPreviewHeight }]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.placeholder, { height: photoPreviewHeight }]}>
          <Text style={[styles.placeholderText, isTablet && styles.placeholderTextTablet]}>
            Take or choose an install photo
          </Text>
        </View>
      )}
      {uploading && (
        <View style={[styles.overlay, { height: photoPreviewHeight }]}>
          <ActivityIndicator color="#FFF" size="large" />
        </View>
      )}
      <View style={[styles.actions, isTablet && isLandscape && styles.actionsLandscape]}>
        <TouchableOpacity style={styles.btnPrimary} onPress={pickFromCamera} disabled={uploading}>
          <Text style={styles.btnPrimaryText}>Take photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnOutline} onPress={pickFromLibrary} disabled={uploading}>
          <Text style={styles.btnOutlineText}>Photo library</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  preview: { width: '100%', borderRadius: 12, backgroundColor: '#E2E8F0' },
  placeholder: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  placeholderText: { color: '#64748B', fontSize: 14, textAlign: 'center', paddingHorizontal: 16 },
  placeholderTextTablet: { fontSize: 16 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  actions: { flexDirection: 'row', gap: 10 },
  actionsLandscape: { maxWidth: 420 },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  btnPrimaryText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  btnOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  btnOutlineText: { color: '#475569', fontWeight: '600', fontSize: 15 },
});
