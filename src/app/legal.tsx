import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Header } from '@/components/layout/Header';
import { LEGAL_DOCUMENTS, type LegalDocumentKey } from '@/features/legal/legalDocuments';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize, LineHeight } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';

function isLegalDocumentKey(value: unknown): value is LegalDocumentKey {
  return value === 'terms' || value === 'privacy';
}

function formatBlock(block: string) {
  return block
    .replace(/^[-*] /gm, '\u2022 ')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,2} /gm, '');
}

export default function LegalScreen() {
  const params = useLocalSearchParams<{ document?: string }>();
  const initialDocument = isLegalDocumentKey(params.document) ? params.document : 'terms';
  const [selectedDocument, setSelectedDocument] = useState<LegalDocumentKey>(initialDocument);
  const document = LEGAL_DOCUMENTS[selectedDocument];
  const blocks = document.content.split(/\n\s*\n/).filter(Boolean);

  return (
    <View style={styles.container}>
      <Header title="Legal" showBack variant="brand" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.draftNotice} accessibilityRole="alert">
          <Text style={styles.draftTitle}>Draft for review</Text>
          <Text style={styles.draftText}>
            These documents are drafts, not final legal terms. They are shown for
            information and are not being presented for acceptance.
          </Text>
        </View>

        <View style={styles.tabs}>
          {(['terms', 'privacy'] as const).map((key) => {
            const isSelected = selectedDocument === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setSelectedDocument(key)}
                style={[styles.tab, isSelected && styles.tabSelected]}
              >
                <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
                  {key === 'terms' ? 'Terms of Use' : 'Privacy Notice'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.documentTitle}>{document.title}</Text>
        <Text style={styles.documentMeta}>Operator: Abdul-Hakim Abdul-Rauf · Pilot: Tamale, Ghana</Text>

        {blocks.map((block, index) => {
          if (block.startsWith('# ')) return null;
          if (block.startsWith('## ')) {
            return (
              <Text key={index} style={styles.sectionTitle}>
                {formatBlock(block)}
              </Text>
            );
          }
          return (
            <Text key={index} selectable style={styles.paragraph}>
              {formatBlock(block)}
            </Text>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.DEFAULT,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  draftNotice: {
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderRadius: 12,
    backgroundColor: Colors.semantic.warning.light,
    borderWidth: 1,
    borderColor: Colors.semantic.warning.DEFAULT,
  },
  draftTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.semantic.warning.dark,
    marginBottom: Spacing.xs,
  },
  draftText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: LineHeight.sm,
    color: Colors.semantic.warning.dark,
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    backgroundColor: Colors.surface.DEFAULT,
  },
  tabSelected: {
    borderColor: Colors.primary.DEFAULT,
    backgroundColor: Colors.primary.subtle,
  },
  tabText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
  },
  tabTextSelected: {
    color: Colors.primary.dark,
  },
  documentTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.dark.DEFAULT,
    marginBottom: Spacing.xs,
  },
  documentMeta: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.dark.DEFAULT,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  paragraph: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: LineHeight.base,
    color: Colors.dark.secondary,
    marginBottom: Spacing.md,
  },
});
