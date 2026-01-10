import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { hashPassword } from '../lib/auth'
import { authenticate, requireRole } from '../middleware/auth'
import type { AuthRequest } from '../middleware/auth'

const router = Router()

router.use(authenticate)
router.use(requireRole(['DONO', 'ADMIN']))

router.get('/', async (req, res) => {
  try {
    const users = await prisma.usuario.findMany({
      select: { id: true, nome: true, login: true, role: true }
    })
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { nome, login, role, senha } = req.body
    if (!nome || !login || !role || !senha) {
      res.status(400).json({ error: 'Invalid data' })
      return
    }
    const hashedPassword = await hashPassword(senha)
    const user = await prisma.usuario.create({
      data: { nome, login, role, senha: hashedPassword }
    })
    res.json({ success: true, user: { id: user.id, nome: user.nome, login: user.login, role: user.role } })
  } catch (error: any) {
    if (error.message?.includes('Unique constraint')) {
      res.status(409).json({ error: 'Login already exists' })
      return
    }
    res.status(500).json({ error: 'Error creating user' })
  }
})

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { nome, login, role, senha } = req.body
    
    const updateData: any = { nome, login, role }
    if (senha) {
      updateData.senha = await hashPassword(senha)
    }

    const user = await prisma.usuario.update({
      where: { id: Number(id) },
      data: updateData,
      select: { id: true, nome: true, login: true, role: true }
    })
    res.json({ success: true, user })
  } catch (error) {
    res.status(500).json({ error: 'Error updating user' })
  }
})

// Delete user
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    // Prevent deleting self
    if (req.user?.userId === Number(id)) {
      res.status(400).json({ error: 'Cannot delete yourself' })
      return
    }

    await prisma.usuario.delete({
      where: { id: Number(id) }
    })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Error deleting user' })
  }
})

export default router
