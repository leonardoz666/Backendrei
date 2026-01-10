import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole } from '../middleware/auth'
import { getIO } from '../lib/socket'

const router = Router()
router.use(authenticate)
router.use(requireRole(['GERENTE', 'DONO', 'CAIXA', 'GARCOM']))

router.get('/', async (req, res) => {
  try {
    const orders = await prisma.ordemProducao.findMany({
      where: { status: { not: 'PRONTO' } },
      include: {
        pedido: { include: { comanda: { include: { mesa: true } } } },
        itens: { include: { pedidoItem: { include: { produto: true } } } }
      },
      orderBy: { criadaEm: 'asc' }
    })
    res.json(orders)
  } catch {
    res.status(500).json({ error: 'Error fetching kitchen orders' })
  }
})

router.put('/', async (req, res) => {
  try {
    const { id, status } = req.body
    if (!id || !status) {
      res.status(400).json({ error: 'Invalid data' })
      return
    }
    const updated = await prisma.ordemProducao.update({ where: { id }, data: { status } })
    
    try {
      getIO().emit('kitchen-order-updated', { id: updated.id, status: updated.status })
    } catch (e) {
      console.error('Socket emit error:', e)
    }

    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Error updating order' })
  }
})

export default router
