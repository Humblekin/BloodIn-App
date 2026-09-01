// Project LifeOrbit — Discover Screen
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Keyboard } from 'react-native';
import { Search, Filter, MapPin } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';

type FilterType = 'all' | 'donors' | 'communities' | 'organizations';

// Mock data
const MOCK_RESULTS = [
  { id: '1', type: 'donor', name: 'Alex Johnson', bloodGroup: 'O+', distance: '2.5 km', recent: true },
  { id: '2', type: 'community', name: 'Downtown Blood Heroes', members: 128, distance: '4.1 km' },
  { id: '3', type: 'organization', name: 'City Central Hospital', verified: true, distance: '1.2 km' },
  { id: '4', type: 'donor', name: 'Sam Smith', bloodGroup: 'A-', distance: '5.0 km' },
];

export default function DiscoverScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const renderFilterPill = (id: FilterType, label: string) => (
    <TouchableOpacity
      style={[styles.filterPill, activeFilter === id && styles.filterPillActive]}
      onPress={() => setActiveFilter(id)}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterText, activeFilter === id && styles.filterTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderResult = ({ item }: { item: typeof MOCK_RESULTS[0] }) => {
    return (
      <View style={styles.card}>
        <Avatar name={item.name} size="md" />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardName}>{item.name}</Text>
            {item.bloodGroup && (
              <Badge label={item.bloodGroup} variant="info" />
            )}
          </View>
          
          <View style={styles.cardMeta}>
            <MapPin size={12} color={Colors.dark.tertiary} />
            <Text style={styles.metaText}>{item.distance}</Text>
            
            {item.type === 'community' && (
              <>
                <Text style={styles.metaDivider}>•</Text>
                <Text style={styles.metaText}>{item.members} members</Text>
              </>
            )}
            
            {item.type === 'organization' && item.verified && (
              <>
                <Text style={styles.metaDivider}>•</Text>
                <Badge label="Verified" variant="success" />
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Discover" />
      
      <View style={styles.searchSection}>
        <Input
          placeholder="Search for people, hospitals..."
          leftIcon={<Search size={20} color={Colors.dark.tertiary} />}
          rightIcon={
            <TouchableOpacity onPress={() => Keyboard.dismiss()}>
              <Filter size={20} color={Colors.primary.DEFAULT} />
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
            data={[
              { id: 'all', label: 'All' },
              { id: 'donors', label: 'Donors' },
              { id: 'communities', label: 'Communities' },
              { id: 'organizations', label: 'Organizations' },
            ]}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => renderFilterPill(item.id as FilterType, item.label)}
            contentContainerStyle={styles.filtersContainer}
          />
        </View>
      </View>

      <Screen padding={false}>
        <FlatList
          data={MOCK_RESULTS.filter(r => activeFilter === 'all' || activeFilter === r.type + 's')}
          keyExtractor={(item) => item.id}
          renderItem={renderResult}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </Screen>
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
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.dark.tertiary,
    marginLeft: 4,
  },
  metaDivider: {
    color: Colors.border.dark,
    marginHorizontal: 6,
    fontSize: FontSize.sm,
  },
});
