import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import path from 'path'
import { createServer } from 'http'
import authRoutes from './routes/auth'
import usersRoutes from './routes/users'
import productsRoutes from './routes/products'
import categoriesRoutes from './routes/categories'
import ordersRoutes from './routes/orders'
import kitchenRoutes from './routes/kitchen'
import tablesRoutes from './routes/tables'
import printersRoutes from './routes/printers'
import dashboardRoutes from './routes/dashboard'
import { errorHandler } from './middleware/errorHandler'
import logger from './lib/logger'
import { initSocket } from './lib/socket'

dotenv.config()

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 4000

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

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

app.get('/', (req, res) => {
  logger.info('Health check request')
  res.json({ message: 'API Rei do Pirão is running', timestamp: new Date() })
})

app.use('/auth', authRoutes)
app.use('/users', usersRoutes)
app.use('/products', productsRoutes)
app.use('/categories', categoriesRoutes)
app.use('/orders', ordersRoutes)
app.use('/kitchen', kitchenRoutes)
app.use('/tables', tablesRoutes)
app.use('/printers', printersRoutes)
app.use('/dashboard', dashboardRoutes)

app.use(errorHandler)

initSocket(httpServer)

httpServer.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`)
})

