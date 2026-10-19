// Project LifeOrbit — Discover Screen
// Discover relevant people, communities, and organizations in the BloodIn
// network. People results come from the privacy-aware find_nearby_users RPC;
// communities and organizations come from live Supabase queries (RLS-protected).
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Keyboard, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Search, MapPin, Users, Building2, Droplet } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { OrbitProfileModal } from '@/features/orbit/components/OrbitProfileModal';
import { discoverService, type DiscoverResult, type DiscoverItemType } from '@/features/discover/services/discoverService';
import { locationService } from '@/features/location/services/locationService';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import type { OrbitNode } from '@/features/orbit/components/OrbitCanvas';

type FilterType = 'people' | 'communities' | 'organizations';

interface FilterOption {
  id: FilterType;
  label: string;
}

const FILTERS: FilterOption[] = [
  { id: 'people', label: 'People' },
  { id: 'communities', label: 'Communities' },
  { id: 'organizations', label: 'Organizations' },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const { search } = useLocalSearchParams<{ search?: string }>();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState(search || '');
  const [activeFilter, setActiveFilter] = useState<FilterType>('people');
  const [willingOnly, setWillingOnly] = useState(false);
  const [results, setResults] = useState<DiscoverResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationRequired, setLocationRequired] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<OrbitNode | null>(null);

  useEffect(() => {
    setSearchQuery(search || '');
  }, [search]);

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeFilter === 'people') {
        const hasLocation = user ? await locationService.hasCurrentLocation(user.id) : false;
        if (!hasLocation) {
          setLocationRequired(true);
          setResults([]);
          return;
        }

        setLocationRequired(false);
        const people = await discoverService.searchPeople({
          limit: 100,
          willingOnly,
        });
        setResults(people);
      } else if (activeFilter === 'communities') {
        setLocationRequired(false);
        const communities = await discoverService.searchCommunities();
        setResults(communities);
      } else {
        setLocationRequired(false);
        const organizations = await discoverService.searchOrganizations();
        setResults(organizations);
      }
    } catch (err) {
      console.warn('[Discover] Failed to load:', err);
      setError('Could not load results right now.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, user?.id, willingOnly]);

  useFocusEffect(
    useCallback(() => {
      void loadResults();
    }, [loadResults])
  );

  const filteredResults = searchQuery.trim()
    ? results.filter((r) => [r.name, r.bloodGroup, r.subtitle]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(searchQuery.trim().toLowerCase())))
    : results;

  const renderFilterPill = (option: FilterOption) => (
    <TouchableOpacity
      style={[styles.filterPill, activeFilter === option.id && styles.filterPillActive]}
      onPress={() => setActiveFilter(option.id)}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterText, activeFilter === option.id && styles.filterTextActive]}>
        {option.label}
      </Text>
    </TouchableOpacity>
  );

  const handleItemPress = (item: DiscoverResult) => {
    if (item.type === 'person') {
      setSelectedNode({
        id: item.id,
        type: 'user',
        distance: item.distanceKm ?? 0,
        angle: 0,
        active: true,
        displayName: item.name,
        bloodGroup: item.bloodGroup || undefined,
        locationName: item.subtitle === 'Connected' ? undefined : item.subtitle,
        avatarUrl: item.avatarUrl,
        donationWillingness: item.donationWillingness as any,
      });
    } else if (item.type === 'community') {
      router.push(`/(main)/community/${item.id}`);
    } else {
      Alert.alert(item.name, 'Organization profiles are not available yet.');
    }
  };

  const handleEnableLocation = async () => {
    if (!user) {
      router.push('/(auth)/welcome');
      return;
    }

    setLocating(true);
    setError(null);
    try {
      const result = await locationService.acquireAndSaveUserLocation(user.id);
      if (!result.success) {
        setError(result.error || 'Could not save your location. Please try again.');
        return;
      }

      setLocationRequired(false);
      await loadResults();
    } catch (err) {
      console.warn('[Discover] Failed to enable location:', err);
      setError('Could not enable location right now. Please try again.');
    } finally {
      setLocating(false);
    }
  };

  const renderResult = ({ item }: { item: DiscoverResult }) => {
    const isPerson = item.type === 'person';
    const formattedDistance =
      item.distanceKm != null && Number.isFinite(item.distanceKm)
        ? item.distanceKm < 1
          ? `${Math.round(item.distanceKm * 1000)} m`
          : `${item.distanceKm.toFixed(1)} km`
        : null;

    return (
      <TouchableOpacity style={styles.card} onPress={() => handleItemPress(item)} activeOpacity={0.75}>
        <Avatar name={item.name} url={item.avatarUrl} size="md" />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardName}>{item.name}</Text>
            {isPerson && item.bloodGroup ? (
              <Badge label={item.bloodGroup} variant="info" />
            ) : item.isVerified ? (
              <Badge label="Verified" variant="success" />
            ) : null}
          </View>

          <View style={styles.cardMeta}>
            {isPerson ? (
              <>
                {item.subtitle === 'Connected' ? (
                  <Badge label="Connected" variant="outline" />
                ) : (
                  <MapPin size={12} color={Colors.dark.tertiary} />
                )}
                {formattedDistance != null && (
                  <Text style={styles.metaText}>{formattedDistance}</Text>
                )}
                {item.subtitle !== 'Connected' && item.subtitle ? (
                  <Text style={styles.metaText} numberOfLines={1}>{item.subtitle}</Text>
                ) : null}
              </>
            ) : item.type === 'community' ? (
              <>
                <Users size={12} color={Colors.dark.tertiary} />
                <Text style={styles.metaText}>{item.subtitle || 'Community'}</Text>
              </>
            ) : (
              <>
                <Building2 size={12} color={Colors.dark.tertiary} />
                <Text style={styles.metaText}>{item.subtitle || 'Organization'}</Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Discover" variant="brand" />

      <View style={styles.searchSection}>
        <Input
          placeholder="Search people, communities..."
          leftIcon={<Search size={20} color={Colors.dark.tertiary} />}
          rightIcon={
            <TouchableOpacity onPress={() => Keyboard.dismiss()}>
              <Search size={20} color={Colors.primary.DEFAULT} />
            </TouchableOpacity>
          }
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          containerStyle={styles.searchInput}
        />

        <View style={styles.filtersScroll}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={FILTERS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => renderFilterPill(item)}
            contentContainerStyle={styles.filtersContainer}
            style={styles.filtersList}
          />
          {activeFilter === 'people' && (
            <TouchableOpacity
              style={[styles.willingToggle, willingOnly && styles.willingToggleActive]}
              onPress={() => setWillingOnly((value) => !value)}
              activeOpacity={0.7}
              accessibilityLabel="Show only willing blood donors"
            >
              <Droplet size={14} color={willingOnly ? Colors.white : Colors.primary.DEFAULT} />
              <Text style={[styles.willingToggleText, willingOnly && styles.willingToggleTextActive]}>
                Willing only
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Screen padding={false}>
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={Colors.primary.DEFAULT} />
          </View>
        ) : locationRequired ? (
          <View style={styles.centerState}>
            <MapPin size={28} color={Colors.primary.DEFAULT} />
            <Text style={styles.stateText}>
              Enable location to find nearby people. Your precise coordinates are used for distance matching.
            </Text>
            {error ? <Text style={styles.locationError}>{error}</Text> : null}
            {error?.includes('Settings') && Platform.OS !== 'web' ? (
              <Button
                title="Open Settings"
                variant="outline"
                onPress={() => { void Linking.openSettings(); }}
                style={styles.locationButton}
              />
            ) : null}
            <Button
              title="Enable Location"
              onPress={handleEnableLocation}
              isLoading={locating}
              leftIcon={<MapPin size={16} color={Colors.white} />}
              style={styles.locationButton}
            />
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Text style={styles.stateText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredResults}
            keyExtractor={(item) => item.id}
            renderItem={renderResult}
            contentContainerStyle={[
              styles.listContent,
              filteredResults.length === 0 && { flexGrow: 1 },
            ]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centerState}>
                <Text style={styles.stateText}>
                  No {activeFilter} found{searchQuery.trim() ? ' matching your search' : ''}.
                </Text>
              </View>
            }
          />
        )}
      </Screen>

      <OrbitProfileModal node={selectedNode} onClose={() => setSelectedNode(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  searchSection: {
    backgroundColor: Colors.surface.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    paddingTop: Spacing.md,
  },
  searchInput: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  filtersScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  filtersList: {
    flex: 1,
  },
  filtersContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  willingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary.DEFAULT,
  },
  willingToggleActive: {
    backgroundColor: Colors.primary.DEFAULT,
  },
  willingToggleText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.primary.DEFAULT,
  },
  willingToggleTextActive: {
    color: Colors.white,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  filterPillActive: {
    backgroundColor: Colors.primary.DEFAULT,
    borderColor: Colors.primary.DEFAULT,
  },
  filterText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
  },
  filterTextActive: {
    color: Colors.white,
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.DEFAULT,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  cardContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing['2xs'],
  },
  cardName: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,
    color: Colors.dark.DEFAULT,
    flex: 1,
    marginRight: Spacing.xs,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.dark.tertiary,
  },
  centerState: {
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationButton: {
    marginTop: Spacing.md,
  },
  locationError: {
    marginTop: Spacing.sm,
    color: Colors.semantic.critical.DEFAULT,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  stateText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});