import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const SECRET_KEY = process.env.JWT_SECRET || 'dev-secret'

export type Session = {
  userId: number
  role: string
  name: string
}

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hash: string) {
  return await bcrypt.compare(password, hash)
}

export function signToken(payload: Omit<Session, 'iat' | 'exp'>) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: '8h' })
}

export function verifyToken(token: string): Session | null {
  try {
    return jwt.verify(token, SECRET_KEY) as Session
  } catch {
    return null
  }
}
