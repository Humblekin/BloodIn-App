import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Header } from '../../components/layout/Header';
import { Screen } from '../../components/layout/Screen';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/spacing';
import { Droplet, UserPlus, Heart, Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { useAuthStore } from '@/features/auth/stores/authStore';
import type { NotificationRow } from '@/features/notifications/services/notificationService';

export default function NotificationsScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { fetchNotifications, markAsRead, loading } = useNotifications();
  
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  useEffect(() => {
    if (session?.user.id) {
      loadData();
    }
  }, [session?.user.id]);

  const loadData = async () => {
    if (!session?.user.id) return;
    try {
      const data = await fetchNotifications(session.user.id);
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePress = async (item: NotificationRow) => {
    if (!item.is_read) {
      // Demo notifications carry non-UUID ids and are not persisted — mark them
      // read locally only. Real ones update the database.
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)) {
        try {
          await markAsRead(item.id);
        } catch (err) {
          console.warn('[Notifications] markAsRead failed:', err);
        }
      }
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
    }

    // Route to the related record based on type + embedded data.
    const data = item.data || {};
    if (data.requestId) {
      router.push(`/(main)/requests/${data.requestId}`);
    } else if (data.conversationId) {
      router.push(`/(main)/messages/${data.conversationId}`);
    } else if (data.communityId) {
      router.push(`/(main)/community/${data.communityId}`);
    } else if (data.campaignId) {
      router.push(`/(main)/campaigns/${data.campaignId}`);
    } else if (data.postId) {
      router.push(`/(main)/posts/${data.postId}`);
    } else if (item.type.includes('connection')) {
      router.push('/(main)/(tabs)/profile/connections');
    } else {
      router.push('/(main)/(tabs)');
    }
  };

  const getIcon = (type: string) => {
    if (type.includes('request') || type.includes('blood')) return <Droplet size={20} color={Colors.semantic.critical.DEFAULT} />;
    if (type.includes('connection')) return <UserPlus size={20} color={Colors.primary.DEFAULT} />;
    if (type.includes('community') || type.includes('campaign')) return <Heart size={20} color={Colors.semantic.warning.DEFAULT} />;
    return <Bell size={20} color={Colors.dark.secondary} />;
  };

  const getIconBg = (type: string) => {
    if (type.includes('request') || type.includes('blood')) return Colors.semantic.critical.light;
    if (type.includes('connection')) return Colors.primary.subtle;
    if (type.includes('community') || type.includes('campaign')) return Colors.semantic.warning.light;
    return Colors.border.light;
  };

  const renderNotification = ({ item }: { item: NotificationRow }) => {
    const time = new Date(item.created_at).toLocaleDateString();
    return (
      <TouchableOpacity 
        style={[styles.notificationRow, !item.is_read && styles.notificationUnread]} 
        activeOpacity={0.7}
        onPress={() => handlePress(item)}
      >
        <View style={[styles.iconContainer, { backgroundColor: getIconBg(item.type) }]}>
          {getIcon(item.type)}
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, !item.is_read && styles.titleUnread]}>{item.title}</Text>
          <Text style={styles.message} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Notifications" showBack />
      <Screen padding={false} backgroundColor={Colors.background.secondary}>
        {loading && notifications.length === 0 ? (
           <View style={styles.center}>
             <ActivityIndicator size="large" color={Colors.primary.DEFAULT} />
           </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderNotification}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.xs }} />}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>You have no notifications.</Text>
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
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.dark.secondary,
  },
  list: {
    padding: Spacing.sm,
  },
  notificationRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    backgroundColor: Colors.surface.DEFAULT,
    borderRadius: BorderRadius.md,
  },
  notificationUnread: {
    backgroundColor: Colors.white,
    shadowColor: Colors.dark.DEFAULT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: Colors.dark.DEFAULT,
    marginBottom: 2,
  },
  titleUnread: {
    fontFamily: FontFamily.bold,
  },
  message: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  time: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary.DEFAULT,
    marginTop: 6,
  },
});
