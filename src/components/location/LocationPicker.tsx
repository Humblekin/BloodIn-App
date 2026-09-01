// Project LifeOrbit — Location Picker Component
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { MapPin, Navigation, X } from 'lucide-react-native';
import { Button } from '../ui/Button';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { Screen } from '../layout/Screen';
import { Header } from '../layout/Header';

export interface LocationPickerProps {
  onLocationSelect?: (location: { latitude: number; longitude: number; name: string }) => void;
  currentLocationName?: string;
}

export function LocationPicker({ onLocationSelect, currentLocationName }: LocationPickerProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleUseCurrentLocation = () => {
    // In a real app, this would use expo-location
    console.log('Fetching GPS coordinates...');
    if (onLocationSelect) {
      onLocationSelect({
        latitude: 5.6037, // Mock coordinates (Accra)
        longitude: -0.1870,
        name: 'Current Location',
      });
    }
    setIsVisible(false);
  };

  const handleMockSelect = (name: string, lat: number, lng: number) => {
    if (onLocationSelect) {
      onLocationSelect({ latitude: lat, longitude: lng, name });
    }
    setIsVisible(false);
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.triggerButton} 
        onPress={() => setIsVisible(true)}
        activeOpacity={0.8}
      >
        <MapPin size={20} color={Colors.primary.DEFAULT} />
        <Text style={styles.triggerText}>
          {currentLocationName || 'Select a location'}
        </Text>
      </TouchableOpacity>

      <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: Colors.background.DEFAULT }}>
          <Header 
            title="Set Location" 
            rightElement={
              <TouchableOpacity onPress={() => setIsVisible(false)} style={styles.closeButton}>
                <X size={24} color={Colors.dark.DEFAULT} />
              </TouchableOpacity>
            }
          />
          
          <Screen padding>
            <View style={styles.mapPlaceholder}>
              <MapPin size={48} color={Colors.dark.tertiary} />
              <Text style={styles.placeholderText}>Map integration (react-native-maps) will be added here.</Text>
            </View>
            
            <View style={styles.actions}>
              <Button
                title="Use Current Location"
                leftIcon={<Navigation size={20} color={Colors.white} />}
                onPress={handleUseCurrentLocation}
                fullWidth
                size="lg"
                style={{ marginBottom: Spacing.lg }}
              />
              
              <Text style={styles.suggestedTitle}>Suggested Locations (Ghana First MVP)</Text>
              
              <TouchableOpacity style={styles.suggestedItem} onPress={() => handleMockSelect('Accra, Greater Accra', 5.6037, -0.1870)}>
                <MapPin size={18} color={Colors.dark.secondary} />
                <Text style={styles.suggestedText}>Accra, Greater Accra</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.suggestedItem} onPress={() => handleMockSelect('Kumasi, Ashanti', 6.6885, -1.6244)}>
                <MapPin size={18} color={Colors.dark.secondary} />
                <Text style={styles.suggestedText}>Kumasi, Ashanti</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.suggestedItem} onPress={() => handleMockSelect('Tamale, Northern', 9.4008, -0.8393)}>
                <MapPin size={18} color={Colors.dark.secondary} />
                <Text style={styles.suggestedText}>Tamale, Northern</Text>
              </TouchableOpacity>
            </View>
          </Screen>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  triggerText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.dark.DEFAULT,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  mapPlaceholder: {
    height: 250,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.dark.tertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  actions: {
    flex: 1,
  },
  suggestedTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.md,
    color: Colors.dark.DEFAULT,
    marginBottom: Spacing.md,
  },
  suggestedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    gap: Spacing.sm,
  },
  suggestedText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.dark.DEFAULT,
  },
});
