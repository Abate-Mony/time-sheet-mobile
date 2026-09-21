import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"
import { getRefreshToken, getToken, saveAccessAndRefreshTokens } from "./auth"
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

// The access token is deliberately short-lived (15 min) — a 401 here first
// means "try the refresh token before giving up" (it's valid for 30 days),
// not "log out". Same pattern as work.wk's customFetch.ts, adapted for
// SecureStore instead of cookies.
const AUTH_ENDPOINTS = ["/auth/login", "/auth/mobile/login", "/auth/login/google", "/auth/refresh", "/auth/logout"]

const isAuthEndpoint = (url?: string) => !!url && AUTH_ENDPOINTS.some(endpoint => url.includes(endpoint))

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

// Single in-flight refresh promise so concurrent 401s (e.g. several screens'
// requests firing right as the access token expires) share one refresh call
// instead of each rotating the refresh token against each other.
let refreshPromise: Promise<string> | null = null

const refreshAccessToken = (): Promise<string> => {
    if (!refreshPromise) {
        refreshPromise = (async () => {
            const refreshToken = await getRefreshToken()
            if (!refreshToken) throw new Error("No refresh token stored")

            const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
            await saveAccessAndRefreshTokens(data.accessToken, data.refreshToken)
            return data.accessToken as string
        })().finally(() => {
            refreshPromise = null
        })
    }
    return refreshPromise
}

customFetch.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
        const config = error.config as RetriableConfig | undefined

        if (
            error.response?.status === 401 &&
            config &&
            !config._retry &&
            !isAuthEndpoint(config.url)
        ) {
            config._retry = true

            try {
                const accessToken = await refreshAccessToken()
                config.headers.Authorization = `Bearer ${accessToken}`
                return customFetch(config)
            } catch (refreshError) {
                // notifyUnauthorized's handler (AuthContext) already calls
                // logout(), which clears the session — no need to do it here too.
                notifyUnauthorized()
                return Promise.reject(refreshError)
            }
        }

        return Promise.reject(error)
    }
)

export default customFetch