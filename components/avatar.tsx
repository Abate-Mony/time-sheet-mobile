import { Image } from "expo-image"
import { StyleSheet, Text, View } from "react-native"

const SIZES = {
  md: 40,
  lg: 56,
  // 60, not 68 — profile/index.tsx wraps this in a 68px ring with 4px
  // padding on each side, so the avatar itself needs to be 8px smaller to
  // fit inside it.
  xl: 60,
} as const

export function Avatar({
  initials,
  src,
  size = "md",
}: {
  initials?: string
  src?: string | null
  size?: keyof typeof SIZES
}) {
  const dimension = SIZES[size]
  const style = { width: dimension, height: dimension, borderRadius: dimension / 2 }

  if (src) {
    return <Image source={{ uri: src }} style={[styles.image, style]} contentFit="cover" />
  }

  return (
    <View style={[styles.fallback, style]}>
      <Text style={[styles.text, { fontSize: dimension * 0.4 }]}>{initials || "U"}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: "#E2E8F0",
  },
  fallback: {
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "800",
    color: "#1E3A5F",
  },
})
