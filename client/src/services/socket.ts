import { io } from 'socket.io-client'

const URL = process.env.NODE_ENV === 'production'
  ? 'https://votre-domaine.com'
  : 'http://localhost:3000'

export const socket = io(URL, {
  autoConnect: true,
  withCredentials: true,
  transports: ['websocket', 'polling'],
  auth: {
    token: localStorage.getItem('token')
  }
})