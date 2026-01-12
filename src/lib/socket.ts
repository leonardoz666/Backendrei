import { Server } from 'socket.io'
import { Server as HttpServer } from 'http'

let io: Server

export const initSocket = (httpServer: HttpServer) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'https://frontendrei.vercel.app'
  ]

  if (process.env.FRONTEND_URL) {
    const envOrigin = process.env.FRONTEND_URL
    if (!allowedOrigins.includes(envOrigin)) {
      allowedOrigins.push(envOrigin)
    }
  }

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    }
  })
  
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  return io
}

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!')
  }
  return io
}
