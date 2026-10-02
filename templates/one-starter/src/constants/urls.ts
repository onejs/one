import { getURL } from 'one'
export const SERVER_URL = getURL()
export const ZERO_SERVER_URL = process.env.VITE_ZERO_URL!
export const API_URL = `${SERVER_URL}/api`
export const AUTH_URL = `${SERVER_URL}/api/auth`
