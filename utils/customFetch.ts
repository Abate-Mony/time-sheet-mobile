import axios from "axios"
import { getToken } from "./auth"

const BASE_URL = "https://api.inprn.com/api/v1"

const customFetch = axios.create({ baseURL: BASE_URL })

customFetch.interceptors.request.use(async config => {
    const token = await getToken()
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

export default customFetch