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
        itens: { include: { pedidoItem: { include: { produto: { select: { nome: true } } } } } }
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

import { printerService } from '../services/PrinterService'

// Reprint order ticket
router.post('/reprint/:id', async (req, res) => {
  try {
    const { id } = req.params
    const orderId = Number(id)

    const order = await prisma.ordemProducao.findUnique({
      where: { id: orderId },
      include: {
        pedido: {
          include: {
            garcom: true,
            comanda: { include: { mesa: true } }
          }
        },
        itens: { include: { pedidoItem: { include: { produto: true } } } }
      }
    })

    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    // Call Printer Service
    printerService.printOrderTicket(order.setor as 'COZINHA' | 'BAR', {
      mesa: order.pedido.comanda.mesa.numero,
      garcom: order.pedido.garcom?.nome || 'Garçom',
      pedidoId: order.pedido.id,
      data: order.criadaEm,
      itens: order.itens.map(i => ({
        quantidade: i.pedidoItem.quantidade,
        produto: i.pedidoItem.produto.nome,
        observacao: i.pedidoItem.observacao
      }))
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Error reprinting:', error)
    res.status(500).json({ error: 'Error on reprinting' })
  }
})

export default router
