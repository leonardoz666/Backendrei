import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import path from 'path'
import authRoutes from './routes/auth'
import usersRoutes from './routes/users'
import productsRoutes from './routes/products'
import categoriesRoutes from './routes/categories'
import ordersRoutes from './routes/orders'
import kitchenRoutes from './routes/kitchen'
import tablesRoutes from './routes/tables'
import printersRoutes from './routes/printers'
import { errorHandler } from './middleware/errorHandler'
import logger from './lib/logger'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

app.use(errorHandler)

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`)
})
