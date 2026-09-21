import {
  getArticlesByCategory,
  getCategories,
  getCategoryLabel,
  searchHelpArticles,
  type HelpArticle,
  type HelpCategoryDef,
} from "@/data/helpArticles";
import { useRecentlyViewedHelp } from "@/hooks/useRecentlyViewedHelp";
import { useRouter } from "expo-router";
import { ChevronLeft, ChevronRight, LifeBuoy, Search, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function ArticleList({ articles, showCategory }: { articles: HelpArticle[]; showCategory?: boolean }) {
  const router = useRouter();
  return (
    <View style={{ gap: 8 }}>
      {articles.map(article => (
        <Pressable
          key={article.slug}
          style={styles.articleRow}
          onPress={() => router.push({ pathname: "/(tabs)/profile/help/[slug]", params: { slug: article.slug } })}
        >
          <View style={styles.flex1}>
            <Text style={styles.articleTitle} numberOfLines={1}>
              {article.title}
            </Text>
            <Text style={styles.articleDescription} numberOfLines={1}>
              {showCategory ? `${getCategoryLabel(article.category)} · ` : ""}
              {article.description}
            </Text>
          </View>
          <ChevronRight size={14} color="#CBD5E1" />
        </Pressable>
      ))}
    </View>
  );
}

function CategoryRow({ category, onPress }: { category: HelpCategoryDef; onPress: () => void }) {
  const count = getArticlesByCategory(category.id).length;
  const Icon = category.icon;
  return (
    <Pressable style={styles.categoryRow} onPress={onPress}>
      <View style={styles.categoryIcon}>
        <Icon size={15} color="#2563EB" />
      </View>
      <View style={styles.flex1}>
        <Text style={styles.categoryLabel}>{category.label}</Text>
        <Text style={styles.categoryDescription} numberOfLines={1}>
          {category.description}
        </Text>
      </View>
      <Text style={styles.categoryCount}>{count}</Text>
      <ChevronRight size={14} color="#CBD5E1" />
    </Pressable>
  );
}

export default function HelpCentreScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const categories = useMemo(() => getCategories(), []);
  const results = useMemo(() => searchHelpArticles(query), [query]);
  const categoryArticles = useMemo(
    () => (categoryId ? getArticlesByCategory(categoryId) : []),
    [categoryId]
  );
  const { recent } = useRecentlyViewedHelp();

  const isSearching = query.trim().length > 0;
  const activeCategory = categoryId ? categories.find(c => c.id === categoryId) : undefined;

  const onChangeQuery = (q: string) => {
    setQuery(q);
    if (q) setCategoryId(null);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          style={styles.backButton}
          onPress={() => (activeCategory ? setCategoryId(null) : router.back())}
        >
          <ChevronLeft size={17} color="#64748B" />
          <Text style={styles.backText}>{activeCategory ? "Help Centre" : "Back"}</Text>
        </Pressable>

        {!activeCategory && (
          <View>
            <Text style={styles.title}>Help Centre</Text>
            <Text style={styles.subtitle}>Guides and answers to help you get the most out of INPRN</Text>
          </View>
        )}

        {!activeCategory && (
          <View style={styles.searchWrap}>
            <Search size={14} color="#94A3B8" />
            <TextInput
              value={query}
              onChangeText={onChangeQuery}
              placeholder="Search help articles…"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
            />
            {!!query && (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <X size={14} color="#94A3B8" />
              </Pressable>
            )}
          </View>
        )}

        {isSearching ? (
          results.length === 0 ? (
            <View style={styles.emptyState}>
              <Search size={20} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No results for &quot;{query}&quot;</Text>
              <Text style={styles.emptyDescription}>Try a different search term, or browse categories.</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <Text style={styles.resultCount}>
                {results.length} result{results.length === 1 ? "" : "s"}
              </Text>
              <ArticleList articles={results} showCategory />
            </View>
          )
        ) : activeCategory ? (
          <View style={{ gap: 12 }}>
            <View style={styles.categoryHeaderRow}>
              <View style={styles.categoryHeaderIcon}>
                <activeCategory.icon size={14} color="#2563EB" />
              </View>
              <Text style={styles.categoryHeaderTitle}>{activeCategory.label}</Text>
            </View>
            <ArticleList articles={categoryArticles} />
          </View>
        ) : (
          <>
            <View style={{ gap: 8 }}>
              {categories.map(cat => (
                <CategoryRow key={cat.id} category={cat} onPress={() => setCategoryId(cat.id)} />
              ))}
            </View>

            {recent.length > 0 && (
              <View>
                <Text style={styles.sectionLabel}>Recently viewed</Text>
                <ArticleList articles={recent} />
              </View>
            )}

            <View style={styles.helpCard}>
              <View style={styles.helpCardIcon}>
                <LifeBuoy size={16} color="#93C5FD" />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.helpCardTitle}>Still need help?</Text>
                <Text style={styles.helpCardBody}>Reach out to your manager or admin directly.</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  flex1: { flex: 1 },
  backButton: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 3 },
  backText: { color: "#64748B", fontSize: 14, fontWeight: "600" },
  title: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  subtitle: { marginTop: 3, fontSize: 12, color: "#94A3B8" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 42,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#0F172A" },
  emptyState: { alignItems: "center", gap: 8, paddingVertical: 32 },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A", textAlign: "center" },
  emptyDescription: { fontSize: 12, color: "#94A3B8", textAlign: "center" },
  resultCount: { fontSize: 12, color: "#94A3B8" },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryLabel: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  categoryDescription: { marginTop: 2, fontSize: 12, color: "#94A3B8" },
  categoryCount: { fontSize: 11, color: "#94A3B8" },
  categoryHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  categoryHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryHeaderTitle: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
  },
  articleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  articleTitle: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  articleDescription: { marginTop: 2, fontSize: 12, color: "#94A3B8" },
  helpCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 18,
  },
  helpCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  helpCardTitle: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  helpCardBody: { marginTop: 2, fontSize: 12, color: "rgba(255,255,255,0.5)" },
});
