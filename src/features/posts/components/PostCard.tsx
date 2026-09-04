// Project LifeOrbit — Post Card
// Purpose-tagged network post used in the Feed and the post detail screen.
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  HeartHandshake,
  Droplets,
  Megaphone,
  Users,
  CalendarDays,
  Building2,
  Heart,
  MessageCircle,
  Repeat2,
  Flag,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ReportModal } from '@/features/moderation/components/ReportModal';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { postService, type PostRow } from '../services/postService';
import { POST_PURPOSE_LABEL } from '../constants/posts';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';

const PURPOSE_ICONS: Record<PostRow['purpose'], LucideIcon> = {
  connection: HeartHandshake,
  assistance: Droplets,
  awareness: Megaphone,
  community: Users,
  campaign: CalendarDays,
  organization: Building2,
};

const PURPOSE_COLORS: Record<PostRow['purpose'], string> = {
  connection: Colors.primary.DEFAULT,
  assistance: Colors.semantic.critical.DEFAULT,
  awareness: Colors.semantic.info.DEFAULT,
  community: Colors.semantic.success.DEFAULT,
  campaign: Colors.semantic.warning.DEFAULT,
  organization: Colors.dark.secondary,
};

interface PostCardProps {
  post: PostRow;
  onOpen?: () => void;
  onToggleReaction?: (postId: string) => void;
  style?: ViewStyle;
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString();
}

export function PostCard({ post, onOpen, onToggleReaction, style }: PostCardProps) {
  const router = useRouter();
  const { session } = useAuthStore();
  const [reportTarget, setReportTarget] = useState<{ id: string } | null>(null);

  const PurposeIcon = PURPOSE_ICONS[post.purpose] ?? HeartHandshake;
  const purposeColor = PURPOSE_COLORS[post.purpose] ?? Colors.primary.DEFAULT;
  const reacted = !!post.my_reaction?.length;
  const reactionCount = typeof post.reaction_count === 'number' ? post.reaction_count : 0;
  const commentCount = typeof post.comment_count === 'number' ? post.comment_count : 0;

  const handleReact = () => {
    if (!session?.user.id) return;
    onToggleReaction?.(post.id);
  };

  const handleShare = () => {
    if (!session?.user.id) return;
    Alert.alert('Repost to your network', 'This shares the post with your network. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Repost',
        onPress: async () => {
          try {
            await postService.sharePost(session.user.id, post.id);
            Alert.alert('Reposted', 'Your post has been shared with your network.');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not repost right now.');
          }
        },
      },
    ]);
  };

  return (
    <>
      <TouchableOpacity style={[styles.card, style]} activeOpacity={onOpen ? 0.8 : 1} onPress={onOpen} disabled={!onOpen}>
        <View style={styles.header}>
          <Avatar name={post.author?.display_name || 'User'} url={post.author?.avatar_url} size="sm" />
          <View style={styles.headerText}>
            <Text style={styles.authorName} numberOfLines={1}>
              {post.author?.display_name || 'User'}
            </Text>
            <Text style={styles.timeText}>{timeAgo(post.created_at)}</Text>
          </View>
          <View style={styles.purposeBadgeRow}>
            <PurposeIcon size={13} color={purposeColor} />
            <Text style={[styles.purposeLabel, { color: purposeColor }]}>
              {POST_PURPOSE_LABEL[post.purpose] ?? 'Post'}
            </Text>
          </View>
        </View>

        <Text style={styles.content} numberOfLines={5}>
          {post.content}
        </Text>

        {(post.blood_group || post.community !== null) && (
          <View style={styles.tags}>
            {post.blood_group ? <Badge label={post.blood_group} variant="info" /> : null}
            {post.community ? <Badge label={post.community.name} leftIcon={<Users size={11} color={Colors.primary.DEFAULT} />} /> : null}
          </View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity style={styles.action} onPress={handleReact} disabled={!session?.user.id}>
            <Heart size={17} color={reacted ? Colors.semantic.critical.DEFAULT : Colors.dark.tertiary} fill={reacted ? Colors.semantic.critical.DEFAULT : 'transparent'} />
            <Text style={[styles.actionText, reacted && { color: Colors.semantic.critical.DEFAULT }]}>{reactionCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.action} onPress={() => router.push(`/(main)/posts/${post.id}`)}>
            <MessageCircle size={17} color={Colors.dark.tertiary} />
            <Text style={styles.actionText}>{commentCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.action} onPress={handleShare}>
            <Repeat2 size={17} color={Colors.dark.tertiary} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.action, styles.actionRight]} onPress={() => setReportTarget({ id: post.id })}>
            <Flag size={16} color={Colors.dark.tertiary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {reportTarget && (
        <ReportModal
          visible
          targetType="post"
          targetId={reportTarget.id}
          onClose={() => setReportTarget(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface.DEFAULT,
    borderRadius: 14,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerText: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  authorName: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,
    color: Colors.dark.DEFAULT,
  },
  timeText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
    marginTop: 1,
  },
  purposeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  purposeLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.xs,
  },
  content: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: 22,
    color: Colors.dark.DEFAULT,
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    flexWrap: 'wrap',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginRight: Spacing.lg,
    paddingVertical: 2,
  },
  actionRight: {
    marginLeft: 'auto',
    marginRight: 0,
  },
  actionText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
  },
});