import type { AccountRestriction } from "@/utils/restriction";
import { TriangleAlert, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function RestrictionBanner({ restriction }: { restriction: AccountRestriction }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const description =
    restriction.reason === "document_expired"
      ? "Your right-to-work document needs updating."
      : restriction.reason === "no_show"
        ? "Your account was temporarily restricted after a missed shift."
        : restriction.reason === "disciplinary"
          ? "Some actions are temporarily restricted while an internal review is completed."
          : restriction.message;

  return (
    <View style={styles.banner}>
      <View style={styles.iconBox}>
        <TriangleAlert size={13} color="#D97706" />
      </View>
      <View style={styles.flex1}>
        <Text style={styles.title}>
          {restriction.accessLevel === "read_only" ? "Your account has read-only access" : "Your account has limited access"}
        </Text>
        <Text style={styles.text}>
          {description}
          {restriction.remedy !== "none" ? " Some actions are temporarily unavailable." : ""}
        </Text>
      </View>
      <Pressable onPress={() => setDismissed(true)} hitSlop={8} style={styles.closeButton}>
        <X size={13} color="#D97706" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 14,
    padding: 12,
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  flex1: { flex: 1 },
  title: { fontSize: 13, fontWeight: "700", color: "#92400E" },
  text: { fontSize: 11, color: "#B45309", marginTop: 2, lineHeight: 15 },
  closeButton: { width: 22, height: 22, alignItems: "center", justifyContent: "center" },
});
