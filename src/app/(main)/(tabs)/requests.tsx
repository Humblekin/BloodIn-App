// Project LifeOrbit — Requests Screen Placeholder
import React from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Droplet } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

export default function RequestsScreen() {
  return (
    <View style={{ flex: 1 }}>
      <Header title="Blood Requests" />
      <Screen>
        <EmptyState
          icon={<Droplet size={48} color={Colors.semantic.critical.DEFAULT} />}
          title="No Active Requests"
          description="There are currently no blood requests in your area. When someone nearby needs help, it will appear here."
        />
      </Screen>
    </View>
  );
}
