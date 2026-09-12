import { io, Socket } from 'socket.io-client'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:4000'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE, { withCredentials: true, autoConnect: false })
  }
  return socket
}

export function connectSocket() {
  const s = getSocket()
  if (!s.connected) s.connect()
  return s
}

export function joinSocket(payload: { qrToken?: string; tableToken?: string; token?: string; businessId?: number }) {
  const s = connectSocket()
  s.emit('join', payload)
  return s
}
