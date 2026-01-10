import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { signToken, comparePassword } from '../lib/auth'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { loginSchema } from '../schemas/auth'

const router = Router()

router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { login, senha } = req.body
    const user = await prisma.usuario.findUnique({ where: { login } })

    if (!user || !(await comparePassword(senha, user.senha))) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const token = signToken({ userId: user.id, role: user.role, name: user.nome })
    
    // Set cookie on response
    // When proxied by Next.js, this cookie will be passed to the browser
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
      path: '/'
    })

    res.json({ success: true, user: { name: user.nome, role: user.role } })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/logout', (req, res) => {
  res.clearCookie('token', { path: '/' })
  res.json({ success: true })
})

router.get('/me', authenticate, (req: AuthRequest, res) => {
  res.json({ user: req.user })
})

export default router
