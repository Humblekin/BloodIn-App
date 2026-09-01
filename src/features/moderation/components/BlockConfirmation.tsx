import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Alert } from 'react-native';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { useBlocking } from '../hooks/useModeration';
import { useAuthStore } from '@/features/auth/stores/authStore';

interface BlockConfirmationProps {
  visible: boolean;
  onClose: () => void;
  targetId: string;
  targetName: string;
  onSuccess?: () => void;
}

export function BlockConfirmation({ visible, onClose, targetId, targetName, onSuccess }: BlockConfirmationProps) {
  const { session } = useAuthStore();
  const { blockUser, loading } = useBlocking();

  const handleBlock = async () => {
    if (!session?.user.id) return;
    try {
      await blockUser(session.user.id, targetId);
      Alert.alert('User Blocked', `${targetName} has been blocked.`);
      onClose();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to block user');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Block {targetName}?</Text>
          <Text style={styles.message}>
            They will not be able to find your profile, see your requests, or message you. Any existing connections will be removed.
          </Text>
          
          <View style={styles.buttonRow}>
            <Pressable 
              style={[styles.button, styles.cancelButton]} 
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.button, styles.blockButton, loading && styles.disabled]} 
              onPress={handleBlock}
              disabled={loading}
            >
              <Text style={styles.blockText}>
                {loading ? 'Blocking...' : 'Block'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: colors.background.default,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.lg,
    color: colors.text.primary,
    marginBottom: 12,
  },
  message: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButton: {
    backgroundColor: colors.background.default,
    borderColor: colors.border.default,
  },
  blockButton: {
    backgroundColor: colors.status.error,
    borderColor: colors.status.error,
  },
  cancelText: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
  },
  blockText: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.md,
    color: colors.text.inverse,
  },
  disabled: {
    opacity: 0.5,
  }
});
