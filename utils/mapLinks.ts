export type MapService = "google" | "apple" | "waze"

export const MAP_SERVICES: { id: MapService; label: string }[] = [
  { id: "google", label: "Google Maps" },
  { id: "apple", label: "Apple Maps" },
  { id: "waze", label: "Waze" },
]

interface Destination {
  lat?: number
  lng?: number
  address?: string
}

export function buildMapUrl(service: MapService, { lat, lng, address }: Destination): string | undefined {
  if (lat != null && lng != null) {
    switch (service) {
      case "google": return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      case "apple": return `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`
      case "waze": return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
    }
  }

  if (!address) return undefined
  const encoded = encodeURIComponent(address)
  switch (service) {
    case "google": return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`
    case "apple": return `https://maps.apple.com/?daddr=${encoded}&dirflg=d`
    case "waze": return `https://waze.com/ul?q=${encoded}&navigate=yes`
  }
}
