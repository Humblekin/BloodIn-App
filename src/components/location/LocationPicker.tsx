// Project LifeOrbit — Location Picker Component
// Lets a user pick their current location (GPS) and enrich it with the
// seeded country/region/city hierarchy so the location can be stored fully.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';
import { MapPin } from 'lucide-react-native';

import { Card } from '../ui/Card';
import { locationService } from '../../features/location/services/locationService';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';

export interface PickedLocation {
  latitude: number;
  longitude: number;
  name: string;
  countryId?: number;
  regionId?: number;
  cityId?: number;
}

interface LocationPickerProps {
  currentLocationName?: string;
  onLocationSelect: (location: PickedLocation) => void;
}

const ACCRA_FALLBACK = { latitude: 5.6037, longitude: -0.187 };

export function LocationPicker({ currentLocationName, onLocationSelect }: LocationPickerProps) {
  const [resolving, setResolving] = useState(false);

  const resolveAndEmit = async (latitude: number, longitude: number) => {
    let countryId: number | undefined;
    let regionId: number | undefined;
    let cityId: number | undefined;
    let name = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

    try {
      const resolved = await locationService.resolveNearestCity(latitude, longitude);
      if (resolved) {
        countryId = resolved.countryId;
        regionId = resolved.regionId;
        cityId = resolved.cityId;
        name = resolved.name;
      }
    } catch (err) {
      console.warn('[LocationPicker] Nearest-city resolution failed:', err);
    }

    onLocationSelect({ latitude, longitude, name, countryId, regionId, cityId });
  };

  const handleLocate = async () => {
    if (resolving) return;
    setResolving(true);
    try {
      let latitude = ACCRA_FALLBACK.latitude;
      let longitude = ACCRA_FALLBACK.longitude;
      let usedMock = false;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync();
        if (position?.coords) {
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        }
      } else {
        usedMock = true;
      }

      await resolveAndEmit(latitude, longitude);

      if (usedMock) {
        Alert.alert(
          'Location permission required',
          'Using your approximate location instead. Enable location access in settings for precise positioning.'
        );
      }
    } catch (err) {
      console.warn('[LocationPicker] Location lookup failed:', err);
      await resolveAndEmit(ACCRA_FALLBACK.latitude, ACCRA_FALLBACK.longitude);
      Alert.alert(
        'Using sample location',
        'We could not access your location, so we used Accra, Ghana as a sample. You can update this later.'
      );
    } finally {
      setResolving(false);
    }
  };

  return (
    <Pressable
      onPress={handleLocate}
      accessibilityRole="button"
      accessibilityLabel="Use my current location"
      style={({ pressed }) => [styles.wrapper, pressed && styles.wrapperPressed]}
    >
      <Card variant="outlined" padding="md" style={styles.card}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            {resolving ? (
              <ActivityIndicator size="small" color={Colors.primary.DEFAULT} />
            ) : (
              <MapPin size={20} color={Colors.primary.DEFAULT} />
            )}
          </View>
          <View style={styles.textSection}>
            <Text style={styles.title}>{resolving ? 'Finding your location…' : 'Use my current location'}</Text>
            <Text numberOfLines={2} style={styles.subtitle}>
              {currentLocationName || 'No location set yet — we will use your nearest city.'}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
  },
  wrapperPressed: {
    opacity: 0.7,
  },
  card: {
    borderColor: Colors.border.DEFAULT,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSection: {
    flex: 1,
  },
  title: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.dark.DEFAULT,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.dark.tertiary,
  },
});