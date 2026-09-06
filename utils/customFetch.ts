import axios from "axios"
import { getToken } from "./auth"
import { notifyUnauthorized } from "./authEvents"

// const BASE_URL = "https://api.inprn.com/api/v1"
export const BASE_URL = "http://192.168.1.81:5000/api/v1"

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