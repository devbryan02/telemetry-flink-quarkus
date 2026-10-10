import axios from "axios"

/** Cliente HTTP del backend Quarkus. */
export const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15_000,
})
