import { Request, Response, NextFunction } from 'express'
import { verifyToken, Session } from '../lib/auth'

export interface AuthRequest extends Request {
  user?: Session
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies.token
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const session = verifyToken(token)
  if (!session || !session.userId) {
    res.status(401).json({ error: 'Unauthorized - Invalid Session' })
    return
  }
  req.user = session
  next()
}

export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    if (req.user.role === 'ADMIN') {
      next()
      return
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  }
}
