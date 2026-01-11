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

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error handler:', err)
  res.status(500).json({ error: 'Internal Server Error', details: err.message })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
