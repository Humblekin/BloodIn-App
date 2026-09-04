import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, Alert, ScrollView } from 'react-native';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { useReporting } from '../hooks/useModeration';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { ReportReason } from '../services/moderationService';
import { AlertCircle, X } from 'lucide-react-native';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: 'user' | 'community' | 'request' | 'message' | 'post';
  targetId: string;
}

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam or malicious content' },
  { value: 'harassment', label: 'Harassment or hate speech' },
  { value: 'fake_account', label: 'Fake account' },
  { value: 'misinformation', label: 'Medical misinformation' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'suspicious_request', label: 'Suspicious blood request' },
  { value: 'other', label: 'Other reason' },
];

export function ReportModal({ visible, onClose, targetType, targetId }: ReportModalProps) {
  const { session } = useAuthStore();
  const { submitReport, loading } = useReporting();
  
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason.');
      return;
    }
    if (!session?.user.id) return;

    try {
      const data: any = { reason: selectedReason, description };
      if (targetType === 'user') data.reported_user_id = targetId;
      if (targetType === 'community') data.reported_community_id = targetId;
      if (targetType === 'request') data.reported_request_id = targetId;
      if (targetType === 'message') data.reported_message_id = targetId;
      if (targetType === 'post') data.reported_post_id = targetId;

      await submitReport(session.user.id, data);
      
      Alert.alert('Report Submitted', 'Thank you. Our moderation team will review this report.');
      onClose();
      setSelectedReason(null);
      setDescription('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit report');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <AlertCircle size={20} color={colors.status.error} />
              <Text style={styles.title}>Submit a Report</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text.secondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollArea}>
            <Text style={styles.label}>Why are you reporting this?</Text>
            
            {REASONS.map((reason) => (
              <Pressable
                key={reason.value}
                style={styles.reasonOption}
                onPress={() => setSelectedReason(reason.value)}
              >
                <View style={[styles.radio, selectedReason === reason.value && styles.radioActive]}>
                  {selectedReason === reason.value && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.reasonText}>{reason.label}</Text>
              </Pressable>
            ))}

            <Text style={styles.label}>Additional Details (Optional)</Text>
            <TextInput
              style={styles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Please provide more context..."
              placeholderTextColor={colors.text.tertiary}
              multiline
              numberOfLines={4}
            />
          </ScrollView>

          <Pressable 
            style={[styles.submitButton, (!selectedReason || loading) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!selectedReason || loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Submitting...' : 'Submit Report'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: colors.background.default,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.lg,
    color: colors.text.primary,
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  scrollArea: {
    marginBottom: 20,
  },
  label: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    marginBottom: 12,
    marginTop: 8,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border.default,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioActive: {
    borderColor: colors.primary.default,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary.default,
  },
  reasonText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
  },
  textArea: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    padding: 12,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.status.error,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.md,
    color: colors.text.inverse,
  },
});
