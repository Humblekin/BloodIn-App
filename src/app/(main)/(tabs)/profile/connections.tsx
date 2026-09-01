import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { UserCheck, Clock } from 'lucide-react-native';
import { useConnections } from '@/features/connections/hooks/useConnections';
import { useAuthStore } from '@/features/auth/stores/authStore';
import type { Connection, ConnectionRequest } from '@/features/connections/services/connectionService';

export default function ConnectionsScreen() {
  const { session } = useAuthStore();
  const { fetchConnections, fetchPendingRequests, respondToRequest, loading } = useConnections();
  
  const [filter, setFilter] = useState<'all' | 'pending'>('all');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);

  useEffect(() => {
    if (session?.user.id) {
      loadData();
    }
  }, [session?.user.id]);

  const loadData = async () => {
    if (!session?.user.id) return;
    try {
      const conns = await fetchConnections(session.user.id);
      const reqs = await fetchPendingRequests(session.user.id);
      setConnections(conns);
      setRequests(reqs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRespond = async (requestId: string, action: 'accepted' | 'declined') => {
    try {
      await respondToRequest(requestId, action);
      Alert.alert('Success', `Connection ${action}.`);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || `Failed to ${action} request`);
    }
  };

  const pendingReceivedCount = requests.filter(r => r.receiver_id === session?.user.id).length;

  const renderActiveConnection = ({ item }: { item: Connection }) => (
    <View style={styles.card}>
      <Avatar name={item.other_user?.display_name || 'User'} imageUrl={item.other_user?.avatar_url || undefined} size="md" />
      <View style={styles.cardContent}>
        <Text style={styles.cardName}>{item.other_user?.display_name}</Text>
        <View style={styles.cardMeta}>
          {item.other_user?.blood_group && <Badge label={item.other_user.blood_group} variant="outline" />}
          
          <View style={styles.statusRow}>
            <UserCheck size={14} color={Colors.semantic.success.DEFAULT} />
            <Text style={[styles.statusText, { color: Colors.semantic.success.DEFAULT }]}>Connected</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderPendingRequest = ({ item }: { item: ConnectionRequest }) => {
    const isReceived = item.receiver_id === session?.user.id;
    const profile = isReceived ? item.sender_profile : item.receiver_profile;
    
    return (
      <View style={styles.card}>
        <Avatar name={profile?.display_name || 'User'} imageUrl={profile?.avatar_url || undefined} size="md" />
        <View style={styles.cardContent}>
          <Text style={styles.cardName}>{profile?.display_name}</Text>
          <View style={styles.cardMeta}>
            {profile?.blood_group && <Badge label={profile.blood_group} variant="outline" />}
            
            {!isReceived && (
              <View style={styles.statusRow}>
                <Clock size={14} color={Colors.dark.tertiary} />
                <Text style={styles.statusText}>Request Sent</Text>
              </View>
            )}
          </View>
        </View>
        
        {isReceived && (
          <View style={styles.actions}>
            <Button title="Accept" size="sm" style={styles.actionBtn} onPress={() => handleRespond(item.id, 'accepted')} />
            <Button title="Decline" variant="outline" size="sm" style={styles.actionBtn} onPress={() => handleRespond(item.id, 'declined')} />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Network Connections" showBack />
      
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, filter === 'all' && styles.tabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>
            All Connections
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, filter === 'pending' && styles.tabActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.tabText, filter === 'pending' && styles.tabTextActive]}>
            Requests {pendingReceivedCount > 0 && `(${pendingReceivedCount})`}
          </Text>
          {pendingReceivedCount > 0 && <View style={styles.badge} />}
        </TouchableOpacity>
      </View>

      <Screen padding={false} backgroundColor={Colors.background.secondary}>
        {loading && connections.length === 0 && requests.length === 0 ? (
          <View style={styles.center}>
             <ActivityIndicator size="large" color={Colors.primary.DEFAULT} />
          </View>
        ) : (
          <FlatList
            data={(filter === 'all' ? connections : requests) as any[]}
            keyExtractor={(item) => item.id}
            renderItem={filter === 'all' ? (renderActiveConnection as any) : (renderPendingRequest as any)}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  {filter === 'all' ? 'No connections found.' : 'No pending requests.'}
                </Text>
              </View>
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary.DEFAULT,
  },
  tabText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
  },
  tabTextActive: {
    color: Colors.primary.DEFAULT,
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.semantic.critical.DEFAULT,
  },
  list: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.DEFAULT,
    padding: Spacing.md,
    borderRadius: 12,
  },
  cardContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  cardName: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,
    color: Colors.dark.DEFAULT,
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionBtn: {
    paddingHorizontal: Spacing.md,
  },
  empty: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.dark.secondary,
  },
});
