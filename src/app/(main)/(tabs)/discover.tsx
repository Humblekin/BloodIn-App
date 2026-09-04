// Project LifeOrbit — Discover Screen
// Discover relevant people, communities, and organizations in the BloodIn
// network. People results come from the privacy-aware find_nearby_users RPC;
// communities and organizations come from live Supabase queries (RLS-protected).
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Keyboard, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, MapPin, Users, Building2 } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { OrbitProfileModal } from '@/features/orbit/components/OrbitProfileModal';
import { discoverService, type DiscoverResult, type DiscoverItemType } from '@/features/discover/services/discoverService';
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
  const { profile } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('people');
  const [results, setResults] = useState<DiscoverResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<OrbitNode | null>(null);

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeFilter === 'people') {
        const people = await discoverService.searchPeople();
        setResults(people);
      } else if (activeFilter === 'communities') {
        const communities = await discoverService.searchCommunities();
        setResults(communities);
      } else {
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
  }, [activeFilter]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const filteredResults = searchQuery.trim()
    ? results.filter((r) => r.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
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
      });
    } else if (item.type === 'community') {
      router.push(`/(main)/community/${item.id}`);
    } else {
      Alert.alert(item.name, 'Organization profiles are not available yet.');
    }
  };

  const renderResult = ({ item }: { item: DiscoverResult }) => {
    const isPerson = item.type === 'person';
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
                {item.distanceKm != null && (
                  <Text style={styles.metaText}>{Math.round(item.distanceKm)} km</Text>
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
      <Header title="Discover" />

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
          />
        </View>
      </View>

      <Screen padding={false}>
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={Colors.primary.DEFAULT} />
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
                  {activeFilter === 'people' ? ' Set your location in your profile to see nearby people.' : ''}
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
    marginBottom: Spacing.md,
  },
  filtersContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
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
  stateText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});