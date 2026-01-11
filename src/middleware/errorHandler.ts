import { Request, Response, NextFunction } from 'express'
import { MulterError } from 'multer'
import logger from '../lib/logger'

export class AppError extends Error {
  statusCode: number
  isOperational: boolean

  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    logger.warn(`Operational Error: ${err.message}`)
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    })
  }

  // Multer Errors
  if (err instanceof MulterError) {
    logger.warn(`Upload Error: ${err.message}`)
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'Arquivo muito grande. O tamanho máximo permitido é 5MB.'
      })
    }
    return res.status(400).json({
      status: 'error',
      message: err.message
    })
  }

  // File Filter Error (Manual throw)
  if (err.message === 'Apenas arquivos de imagem (jpeg, jpg, png, webp) são permitidos!') {
    return res.status(400).json({
      status: 'error',
      message: err.message
    })
  }

  logger.error('Unexpected Error:', err)
  
  // Database Errors (Prisma)
  if (err.code === 'P2002') {
    return res.status(409).json({
      status: 'error',
      message: 'Unique constraint violation'
    })
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      status: 'error',
      message: 'Record not found'
    })
  }

  return res.status(500).json({
    status: 'error',
    message: 'Internal Server Error'
  })
}
