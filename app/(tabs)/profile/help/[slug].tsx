import { getArticleBySlug, getCategoryLabel, getRelatedArticles, type HelpSection } from "@/data/helpArticles";
import { useRecentlyViewedHelp } from "@/hooks/useRecentlyViewedHelp";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function ArticleSectionView({ section }: { section: HelpSection }) {
  return (
    <View>
      {!!section.heading && <Text style={styles.sectionHeading}>{section.heading}</Text>}
      {!!section.body && <Text style={styles.sectionBody}>{section.body}</Text>}
      {!!section.steps && (
        <View style={styles.stepList}>
          {section.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      )}
      {!!section.bullets && (
        <View style={styles.bulletList}>
          {section.bullets.map((b, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          ))}
        </View>
      )}
      {!!section.note && (
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>{section.note}</Text>
        </View>
      )}
    </View>
  );
}

export default function HelpArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const article = slug ? getArticleBySlug(slug) : undefined;
  const { markViewed } = useRecentlyViewedHelp();

  useEffect(() => {
    if (article) markViewed(article.slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?.slug]);

  useEffect(() => {
    if (!article) router.replace("/(tabs)/profile/help" as any);
  }, [article, router]);

  if (!article) return null;

  const related = getRelatedArticles(article);
  const categoryLabel = getCategoryLabel(article.category);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={17} color="#64748B" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View>
          <Text style={styles.categoryLabel}>{categoryLabel}</Text>
          <Text style={styles.title}>{article.title}</Text>
          <Text style={styles.description}>{article.description}</Text>

          {!!article.link && (
            <Pressable
              style={styles.linkButton}
              onPress={() => router.push(article.link!.to as any)}
            >
              <Text style={styles.linkButtonText}>{article.link.label}</Text>
              <ExternalLink size={11} color="#2563EB" />
            </Pressable>
          )}
        </View>

        <View style={{ gap: 16 }}>
          {article.content.map((section, i) => (
            <ArticleSectionView key={i} section={section} />
          ))}
        </View>

        {related.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={styles.relatedTitle}>Related articles</Text>
            <View style={{ gap: 8 }}>
              {related.map(a => (
                <Pressable
                  key={a.slug}
                  style={styles.relatedRow}
                  onPress={() => router.push({ pathname: "/(tabs)/profile/help/[slug]", params: { slug: a.slug } })}
                >
                  <Text style={styles.relatedRowTitle}>{a.title}</Text>
                  <ChevronRight size={14} color="#CBD5E1" />
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  backButton: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 3 },
  backText: { color: "#64748B", fontSize: 14, fontWeight: "600" },
  categoryLabel: { fontSize: 11, color: "#94A3B8", marginBottom: 3 },
  title: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  description: { marginTop: 4, fontSize: 12, color: "#94A3B8" },
  linkButton: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10 },
  linkButtonText: { fontSize: 12, fontWeight: "700", color: "#2563EB" },
  sectionHeading: { fontSize: 14, fontWeight: "700", color: "#0F172A", marginBottom: 5 },
  sectionBody: { fontSize: 14, color: "#475569", lineHeight: 21 },
  stepList: { marginTop: 8, gap: 8 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(30,58,95,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepNumberText: { fontSize: 11, fontWeight: "700", color: "#1E3A5F" },
  stepText: { flex: 1, fontSize: 14, color: "#475569", lineHeight: 21 },
  bulletList: { marginTop: 8, gap: 6 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  bulletDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#94A3B8", marginTop: 9 },
  bulletText: { flex: 1, fontSize: 14, color: "#475569", lineHeight: 21 },
  noteBox: {
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noteText: { fontSize: 12, color: "#92400E", lineHeight: 18 },
  relatedSection: { paddingTop: 16, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  relatedTitle: { fontSize: 12, fontWeight: "700", color: "#0F172A", marginBottom: 8 },
  relatedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  relatedRowTitle: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
});
