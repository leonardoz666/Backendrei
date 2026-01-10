import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    // If it's a GET request, validate query params?
    // For now, let's assume we validate body for POST/PUT
    schema.parse(req.body)
    next()
  } catch (error: any) {
    res.status(400).json({ error: 'Validation error', details: error.errors })
  }
}
