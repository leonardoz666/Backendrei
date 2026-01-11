import { prisma } from '../lib/prisma'
import { getIO } from '../lib/socket'
import { printerService } from './PrinterService'
import { AppError } from '../middleware/errorHandler'

interface CreateOrderItem {
  produtoId: number
  quantidade: number
  observacao?: string
}

interface CreateOrderData {
  mesaId: number
  itens: CreateOrderItem[]
  userId: number
  userName?: string
}

export class OrderService {
  async createOrder(data: CreateOrderData) {
    const { mesaId, itens, userId, userName } = data

    if (!mesaId || !itens || itens.length === 0) {
      throw new AppError('Invalid data provided', 400)
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find or create Comanda
      let comanda = await tx.comanda.findFirst({
        where: { mesaId, status: 'ABERTA' }
      })

      if (!comanda) {
        const mesa = await tx.mesa.findUnique({ where: { id: mesaId } })
        if (!mesa) {
          throw new AppError('Table not found', 404)
        }
        await tx.mesa.update({ where: { id: mesaId }, data: { status: 'OCUPADA' } })
        comanda = await tx.comanda.create({ data: { mesaId, status: 'ABERTA' } })
      }

      // 2. Create Pedido
      const pedido = await tx.pedido.create({
        data: {
          comandaId: comanda.id,
          garcomId: userId,
          status: 'ABERTO'
        }
      })

      let totalPedido = 0
      const productionOrdersData: { sector: string; pedidoItemId: number }[] = []

      // 3. Process Items
      for (const item of itens) {
        const produto = await tx.produto.findUnique({
          where: { id: item.produtoId }
        })
        if (!produto) continue

        totalPedido += produto.preco * item.quantidade
        
        const pedidoItem = await tx.pedidoItem.create({
          data: {
            pedidoId: pedido.id,
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            observacao: item.observacao,
            status: 'PENDENTE'
          }
        })

        let sector = null
        if (produto.isDrink) sector = 'BAR'
        else if (produto.isFood) sector = 'COZINHA'
        
        if (sector) {
          productionOrdersData.push({ sector, pedidoItemId: pedidoItem.id })
        }
      }

      // 4. Update Comanda Total
      await tx.comanda.update({
        where: { id: comanda.id },
        data: { total: { increment: totalPedido } }
      })

      // 5. Create Production Orders
      const itemsBySector: Record<string, number[]> = {}
      for (const item of productionOrdersData) {
        if (!itemsBySector[item.sector]) itemsBySector[item.sector] = []
        itemsBySector[item.sector].push(item.pedidoItemId)
      }

      const createdOrders = []

      for (const [sector, itemIds] of Object.entries(itemsBySector)) {
        const ordem = await tx.ordemProducao.create({
          data: {
            pedidoId: pedido.id,
            setor: sector,
            status: 'RECEBIDO'
          }
        })

        for (const itemId of itemIds) {
          await tx.ordemItem.create({
            data: {
              ordemProducaoId: ordem.id,
              pedidoItemId: itemId
            }
          })
        }
        createdOrders.push(ordem.id)
      }

      return { comanda, pedido, createdOrders }
    })

    // --- Post-Transaction (Side Effects: Socket & Print) ---
    this.handlePostCreationEffects(result.createdOrders, userName)

    return { success: true, comandaId: result.comanda.id, pedidoId: result.pedido.id }
  }

  private async handlePostCreationEffects(orderIds: number[], userName?: string) {
    for (const ordemId of orderIds) {
      const fullOrder = await prisma.ordemProducao.findUnique({
        where: { id: ordemId },
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

      if (fullOrder) {
        try {
          getIO().emit('new-kitchen-order', fullOrder)
          
          printerService.printOrderTicket(fullOrder.setor as 'COZINHA' | 'BAR', {
            mesa: fullOrder.pedido.comanda.mesa.numero,
            garcom: userName || 'Garçom',
            pedidoId: fullOrder.pedido.id,
            data: fullOrder.criadaEm,
            itens: fullOrder.itens.map(i => ({
              quantidade: i.pedidoItem.quantidade,
              produto: i.pedidoItem.produto.nome,
              observacao: i.pedidoItem.observacao
            }))
          })
        } catch (e) {
          console.error('Socket/Printer error:', e)
        }
      }
    }
  }
}

export const orderService = new OrderService()
