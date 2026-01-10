import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getIO } from '../lib/socket'
import { validate } from '../middleware/validate'
import { createOrderSchema } from '../schemas/order'
import { printerService } from '../services/PrinterService'

const router = Router()
router.use(authenticate)

router.post('/', validate(createOrderSchema), async (req: AuthRequest, res) => {
  try {
    const { mesaId, itens } = req.body
    if (!mesaId || !itens || itens.length === 0) {
      res.status(400).json({ error: 'Invalid data' })
      return
    }

    let comanda = await prisma.comanda.findFirst({
      where: { mesaId, status: 'ABERTA' }
    })

    if (!comanda) {
      const mesa = await prisma.mesa.findUnique({ where: { id: mesaId } })
      if (!mesa) {
        res.status(404).json({ error: 'Table not found' })
        return
      }
      await prisma.mesa.update({ where: { id: mesaId }, data: { status: 'OCUPADA' } })
      comanda = await prisma.comanda.create({ data: { mesaId, status: 'ABERTA' } })
    }

    const userId = req.user!.userId
    const pedido = await prisma.pedido.create({
      data: {
        comandaId: comanda.id,
        garcomId: userId,
        status: 'ABERTO'
      }
    })

    let totalPedido = 0
    const productionOrders: Record<string, number[]> = {}

    for (const item of itens) {
      const produto = await prisma.produto.findUnique({
        where: { id: item.produtoId },
        include: { categoria: true }
      })
      if (!produto) continue

      totalPedido += produto.preco * item.quantidade
      const pedidoItem = await prisma.pedidoItem.create({
        data: {
          pedidoId: pedido.id,
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          observacao: item.observacao,
          status: 'PENDENTE'
        }
      })

      let sector = null
      
      if (produto.isDrink) {
        sector = 'BAR'
      } else if (produto.isFood) {
        sector = 'COZINHA'
      }
      
      if (sector) {
        if (!productionOrders[sector]) productionOrders[sector] = []
        productionOrders[sector].push(pedidoItem.id)
      }
    }

    await prisma.comanda.update({
      where: { id: comanda.id },
      data: { total: { increment: totalPedido } }
    })

    for (const [sector, items] of Object.entries(productionOrders)) {
      const ordem = await prisma.ordemProducao.create({
        data: {
          pedidoId: pedido.id,
          setor: sector,
          status: 'RECEBIDO'
        }
      })

      for (const item of items) {
        await prisma.ordemItem.create({
          data: {
            ordemProducaoId: ordem.id,
            pedidoItemId: item
          }
        })
      }

      // Fetch full order to emit via Socket.io
      const fullOrder = await prisma.ordemProducao.findUnique({
        where: { id: ordem.id },
        include: {
          pedido: {
            include: {
              comanda: {
                include: { mesa: true }
              }
            }
          },
          itens: {
            include: {
              pedidoItem: {
                include: { produto: true }
              }
            }
          }
        }
      })

      try {
        getIO().emit('new-kitchen-order', fullOrder)
        
        // Send to Printer
        if (fullOrder) {
          printerService.printOrderTicket(sector as 'COZINHA' | 'BAR', {
            mesa: fullOrder.pedido.comanda.mesa.numero,
            garcom: req.user?.name || 'Garçom',
            pedidoId: fullOrder.pedido.id,
            data: fullOrder.criadaEm,
            itens: fullOrder.itens.map(i => ({
              quantidade: i.pedidoItem.quantidade,
              produto: i.pedidoItem.produto.nome,
              observacao: i.pedidoItem.observacao
            }))
          })
        }
      } catch (e) {
        console.error('Socket/Printer error:', e)
      }
    }

    res.json({ success: true, comandaId: comanda.id, pedidoId: pedido.id })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error creating order' })
  }
})

export default router
