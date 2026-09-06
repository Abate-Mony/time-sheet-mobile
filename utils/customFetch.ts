import axios from "axios"
import { getToken } from "./auth"
import { notifyUnauthorized } from "./authEvents"

// Set per environment via .env files (EXPO_PUBLIC_ vars are inlined into the
// bundle at build time, not read at runtime — see .env.production for the
// real backend, and .env.local (gitignored, not committed) for your own
// laptop's LAN IP when running `expo start` for local dev).
if (!process.env.EXPO_PUBLIC_API_URL) {
    throw new Error(
        "EXPO_PUBLIC_API_URL is not set. Add it to .env.local (LAN IP for local dev) — .env.production already has the real backend URL for release builds."
    )
}
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL

const customFetch = axios.create({ baseURL: BASE_URL })

customFetch.interceptors.request.use(async config => {
    const token = await getToken()
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// A 401 here means the token is missing/invalid/expired (authMiddleware's
// only use of that status — a 403 from authorizePermissions is a separate,
// legitimate "wrong role" case and shouldn't log anyone out). Bounce back
// to login rather than leaving the screen stuck on a failed request.
customFetch.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            notifyUnauthorized()
        }
        return Promise.reject(error)
    }
)

export default customFetch