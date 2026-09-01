import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { useBloodRequests } from '@/features/requests/hooks/useBloodRequests';
import { useAuthStore } from '@/features/auth/stores/authStore';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function CreateRequestScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { createRequest, loading } = useBloodRequests();

  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [urgencyLevel, setUrgencyLevel] = useState<1 | 2 | 3>(1);
  const [hospitalName, setHospitalName] = useState('');
  const [unitsRequired, setUnitsRequired] = useState('1');
  const [contactNumber, setContactNumber] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [safetyAccepted, setSafetyAccepted] = useState(false);

  const handleSubmit = async () => {
    if (!bloodGroup || !hospitalName || !unitsRequired) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    if (!safetyAccepted) {
      Alert.alert('Safety Check', 'You must acknowledge the safety disclaimer.');
      return;
    }

    if (!session?.user.id) return;

    try {
      // Create request expiring in 3 days for demo purposes
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);

      const newRequest = await createRequest(session.user.id, {
        blood_group: bloodGroup,
        urgency_level: urgencyLevel,
        hospital_name: hospitalName,
        units_required: parseInt(unitsRequired, 10) || 1,
        contact_number: contactNumber,
        additional_notes: additionalNotes,
        latitude: 5.6037, // Defaulting to Accra for MVP
        longitude: -0.1870,
        expires_at: expiresAt.toISOString(),
      });

      Alert.alert('Success', 'Blood request created successfully.', [
        { text: 'OK', onPress: () => router.push(`/requests/${newRequest.id}`) }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create request');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'New Request' }} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blood Group Needed *</Text>
          <View style={styles.bloodGroupGrid}>
            {BLOOD_GROUPS.map((bg) => (
              <Pressable
                key={bg}
                style={[
                  styles.bloodGroupButton,
                  bloodGroup === bg && styles.bloodGroupButtonActive
                ]}
                onPress={() => setBloodGroup(bg)}
              >
                <Text style={[
                  styles.bloodGroupText,
                  bloodGroup === bg && styles.bloodGroupTextActive
                ]}>{bg}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Urgency Level *</Text>
          <View style={styles.urgencyOptions}>
            {[
              { level: 1, label: 'Normal' },
              { level: 2, label: 'Urgent' },
              { level: 3, label: 'Critical' }
            ].map((option) => (
              <Pressable
                key={option.level}
                style={[
                  styles.urgencyButton,
                  urgencyLevel === option.level && styles.urgencyButtonActive
                ]}
                onPress={() => setUrgencyLevel(option.level as 1 | 2 | 3)}
              >
                <Text style={[
                  styles.urgencyText,
                  urgencyLevel === option.level && styles.urgencyTextActive
                ]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.inputLabel}>Hospital / Facility Name *</Text>
          <TextInput
            style={styles.input}
            value={hospitalName}
            onChangeText={setHospitalName}
            placeholder="e.g. Korle-Bu Teaching Hospital"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={styles.inputLabel}>Units Required *</Text>
          <TextInput
            style={styles.input}
            value={unitsRequired}
            onChangeText={setUnitsRequired}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={styles.inputLabel}>Contact Number (Optional)</Text>
          <TextInput
            style={styles.input}
            value={contactNumber}
            onChangeText={setContactNumber}
            keyboardType="phone-pad"
            placeholder="+233 XX XXX XXXX"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={styles.inputLabel}>Additional Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            placeholder="Any specific requirements or instructions..."
            placeholderTextColor={colors.text.tertiary}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.disclaimerSection}>
          <View style={styles.disclaimerHeader}>
            <Text style={styles.disclaimerTitle}>Safety & Compliance</Text>
            <Switch
              value={safetyAccepted}
              onValueChange={setSafetyAccepted}
              trackColor={{ false: colors.border.default, true: colors.primary.light }}
              thumbColor={safetyAccepted ? colors.primary.default : colors.text.tertiary}
            />
          </View>
          <Text style={styles.disclaimerText}>
            I confirm that this request is genuine. I understand that BloodIn is not a medical provider, and all blood donations must be professionally screened by certified healthcare facilities before transfusion. Selling blood is strictly prohibited and will result in a ban.
          </Text>
        </View>

        <Pressable 
          style={[styles.submitButton, (!safetyAccepted || loading) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!safetyAccepted || loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Creating...' : 'Post Request'}
          </Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    marginBottom: 12,
  },
  bloodGroupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bloodGroupButton: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.card,
  },
  bloodGroupButtonActive: {
    backgroundColor: colors.primary.default,
    borderColor: colors.primary.default,
  },
  bloodGroupText: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.lg,
    color: colors.text.primary,
  },
  bloodGroupTextActive: {
    color: colors.text.inverse,
  },
  urgencyOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  urgencyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
  },
  urgencyButtonActive: {
    borderColor: colors.primary.default,
    backgroundColor: colors.primary.light,
  },
  urgencyText: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  urgencyTextActive: {
    color: colors.primary.default,
  },
  inputLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    padding: 12,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  disclaimerSection: {
    backgroundColor: colors.status.warning + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.status.warning + '30',
  },
  disclaimerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  disclaimerTitle: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.sm,
    color: colors.status.warning,
  },
  disclaimerText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: colors.primary.default,
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
