import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole } from '../middleware/auth'

const router = Router()
router.use(authenticate)

// List all categories
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.categoria.findMany({
      include: {
        produtos: {
          where: { ativo: true }
        }
      },
      orderBy: { nome: 'asc' }
    })
    res.json(categories)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching categories' })
  }
})

// Create category (Admin/Dono only)
router.post('/', requireRole(['ADMIN', 'DONO']), async (req: Request, res: Response) => {
  try {
    const { nome, setor } = req.body
    if (!nome || !setor) {
      res.status(400).json({ error: 'Name and Sector are required' })
      return
    }

    const category = await prisma.categoria.create({
      data: { nome, setor }
    })
    res.status(201).json(category)
  } catch (error) {
    res.status(500).json({ error: 'Error creating category' })
  }
})

// Update category (Admin/Dono only)
router.put('/:id', requireRole(['ADMIN', 'DONO']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { nome, setor } = req.body

    const category = await prisma.categoria.update({
      where: { id: Number(id) },
      data: { nome, setor }
    })
    res.json(category)
  } catch (error) {
    res.status(500).json({ error: 'Error updating category' })
  }
})

// Delete category (Admin/Dono only)
router.delete('/:id', requireRole(['ADMIN', 'DONO']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await prisma.categoria.delete({
      where: { id: Number(id) }
    })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Error deleting category' })
  }
})

export default router
