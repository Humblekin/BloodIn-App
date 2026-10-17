// Project LifeOrbit — Location Picker Component
// Lets a user acquire their current verified GPS location and enrich it with the
// seeded country/region/city hierarchy so the location can be stored reliably.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, ActivityIndicator, Alert, Linking } from 'react-native';
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
  accuracy?: number | null;
}

interface LocationPickerProps {
  currentLocationName?: string;
  onLocationSelect: (location: PickedLocation) => void;
}

export function LocationPicker({ currentLocationName, onLocationSelect }: LocationPickerProps) {
  const [resolving, setResolving] = useState(false);

  const handleLocate = async () => {
    if (resolving) return;
    setResolving(true);

    try {
      // 1. Acquire genuine device GPS coordinates
      const coords = await locationService.acquireCurrentPosition();

      // 2. Resolve nearest Ghana city/region if applicable
      let countryId: number | undefined;
      let regionId: number | undefined;
      let cityId: number | undefined;
      let name = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;

      try {
        const resolved = await locationService.resolveNearestCity(coords.latitude, coords.longitude);
        if (resolved) {
          countryId = resolved.countryId;
          regionId = resolved.regionId;
          cityId = resolved.cityId;
          name = resolved.name;
        }
      } catch (resolveErr) {
        console.warn('[LocationPicker] Nearest-city resolution note:', resolveErr);
      }

      onLocationSelect({
        latitude: coords.latitude,
        longitude: coords.longitude,
        name,
        countryId,
        regionId,
        cityId,
        accuracy: coords.accuracy,
      });
    } catch (err: any) {
      console.warn('[LocationPicker] Location lookup error:', err);
      const errMsg = err?.message || '';

      if (errMsg.includes('permanently denied') || errMsg.includes('Settings')) {
        Alert.alert(
          'Location Permission Required',
          'Location access is required to find nearby donors and community members. Please enable it in your device Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      } else if (errMsg.includes('disabled') || errMsg.includes('services')) {
        Alert.alert(
          'Location Services Disabled',
          'GPS/Location services are disabled on your device. Please turn on Location in quick settings and try again.'
        );
      } else if (errMsg === 'LOCATION_PERMISSION_DENIED') {
        Alert.alert(
          'Location Permission Denied',
          'BloodIn needs your location permission to discover nearby donors. You can tap again to allow.'
        );
      } else if (errMsg.includes('Location accuracy')) {
        Alert.alert('Precise Location Needed', errMsg);
      } else {
        Alert.alert(
          'Location Unavailable',
          'Could not get an accurate GPS reading. Please ensure you have a clear view of the sky and try again.'
        );
      }
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
              {currentLocationName || 'Tap to detect your current location via GPS'}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: Spacing.xs,
  },
  wrapperPressed: {
    opacity: 0.85,
  },
  card: {
    borderColor: Colors.border.DEFAULT,
    backgroundColor: Colors.surface.DEFAULT,
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
    backgroundColor: Colors.primary.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSection: {
    flex: 1,
  },
  title: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: Colors.dark.DEFAULT,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
    lineHeight: 16,
  },
});