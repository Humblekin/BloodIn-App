// Project LifeOrbit — Requests Screen
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Droplet, MapPin, Clock, PlusCircle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize, LineHeight } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { UrgencyBadge } from '@/features/requests/components/UrgencyBadge';
import { requestService, type BloodRequestRow } from '@/features/requests/services/requestService';

export default function RequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<BloodRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      setError(null);
      const data = await requestService.getActiveRequests({ limit: 50 });
      setRequests(data);
    } catch (err) {
      console.warn('[Requests] Failed to load:', err);
      setError('Could not load blood requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
  };

  const renderRequest = ({ item }: { item: BloodRequestRow }) => {
    const isExpired = new Date(item.expires_at) < new Date();
    const timeLabel = isExpired ? 'Expired' : 'Active';

    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => router.push(`/(main)/requests/${item.id}`)}
        activeOpacity={0.75}
      >
        <View style={styles.requestBlood}>
          <Text style={styles.requestBloodText}>{item.blood_group}</Text>
          <Text style={styles.requestUnits}>{item.units_required} U</Text>
        </View>
        <View style={styles.requestBody}>
          <View style={styles.requestTopRow}>
            <Text style={styles.requestName} numberOfLines={1}>
              {item.patient_name || item.hospital_name}
            </Text>
            <UrgencyBadge level={item.urgency_level} />
          </View>
          <View style={styles.requestMetaRow}>
            <View style={styles.requestMetaItem}>
              <MapPin size={13} color={Colors.dark.tertiary} />
              <Text style={styles.requestMetaText} numberOfLines={1}>{item.hospital_name}</Text>
            </View>
            <View style={styles.requestMetaItem}>
              <Clock size={13} color={Colors.dark.tertiary} />
              <Text style={styles.requestMetaText}>{timeLabel}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Blood Requests" variant="brand" />
      <Screen padding={false} backgroundColor={Colors.background.secondary}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary.DEFAULT} />
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            renderItem={renderRequest}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary.DEFAULT} />
            }
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.xs }} />}
            ListEmptyComponent={
              error ? (
                <View style={styles.center}>
                  <Text style={styles.emptyText}>{error}</Text>
                </View>
              ) : (
                <Card variant="flat" style={styles.stateCard}>
                  <Text style={styles.stateTitle}>No active requests right now</Text>
                  <Text style={styles.stateText}>
                    When someone nearby needs blood, their request will show up here. You can also post one yourself.
                  </Text>
                  <Button
                    title="Post a request"
                    variant="secondary"
                    size="sm"
                    leftIcon={<PlusCircle size={16} color={Colors.primary.dark} />}
                    style={styles.stateButton}
                    onPress={() => router.push('/(main)/requests/create')}
                  />
                </Card>
              )
            }
          />
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.dark.secondary,
    textAlign: 'center',
  },
  list: {
    padding: Spacing.sm,
    backgroundColor: Colors.background.secondary,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.DEFAULT,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  requestBlood: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.semantic.critical.light,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.md,
    minWidth: 64,
  },
  requestBloodText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.semantic.critical.dark,
  },
  requestUnits: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.semantic.critical.dark,
    marginTop: 2,
  },
  requestBody: {
    flex: 1,
  },
  requestTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  requestName: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,
    color: Colors.dark.DEFAULT,
    flex: 1,
    marginRight: Spacing.sm,
  },
  requestMetaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  requestMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  requestMetaText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
    flexShrink: 1,
  },
  stateCard: {
    padding: Spacing.lg,
    margin: Spacing.sm,
  },
  stateTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,
    color: Colors.dark.DEFAULT,
    marginBottom: Spacing.xs,
  },
  stateText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: LineHeight.sm,
    color: Colors.dark.secondary,
  },
  stateButton: {
    alignSelf: 'flex-start',
    marginTop: Spacing.md,
  },
});