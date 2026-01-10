import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole } from '../middleware/auth'
import { printerService } from '../services/PrinterService'

const router = Router()
router.use(authenticate)

// Create table (Admin/Dono only)
router.post('/', requireRole(['ADMIN', 'DONO']), async (req, res) => {
  try {
    let { numero } = req.body
    
    if (numero) {
      // Check if table number already exists
      const existing = await prisma.mesa.findUnique({
        where: { numero: Number(numero) }
      })
      if (existing) {
        res.status(409).json({ error: 'Mesa já existe' })
        return
      }
    } else {
      // Auto-increment fallback
      const highestMesa = await prisma.mesa.findFirst({
        orderBy: { numero: 'desc' }
      })
      numero = (highestMesa?.numero || 0) + 1
    }
    
    const mesa = await prisma.mesa.create({
      data: {
        numero: Number(numero),
        status: 'LIVRE'
      }
    })
    res.json(mesa)
  } catch {
    res.status(500).json({ error: 'Error creating table' })
  }
})

router.get('/', async (req, res) => {
  try {
    const tables = await prisma.mesa.findMany({
      include: {
        comandas: {
          where: { status: 'ABERTA' },
          take: 1,
          include: {
            usuario: {
              select: { nome: true }
            }
          }
        }
      },
      orderBy: { numero: 'asc' }
    })
    res.json(tables)
  } catch {
    res.status(500).json({ error: 'Error fetching tables' })
  }
})

router.get('/my/opened', async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const tables = await prisma.mesa.findMany({
      where: {
        comandas: {
          some: {
            status: 'ABERTA',
            usuarioId: userId
          }
        }
      },
      include: {
        comandas: {
          where: { status: 'ABERTA' },
          take: 1
        }
      },
      orderBy: { numero: 'asc' }
    })
    res.json(tables)
  } catch {
    res.status(500).json({ error: 'Error fetching my tables' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const table = await prisma.mesa.findUnique({
      where: { id: Number(id) },
      include: {
        comandas: {
          where: { status: 'ABERTA' },
          include: {
            pedidos: {
              include: {
                itens: {
                  include: {
                    produto: true
                  }
                }
              },
              orderBy: { criadoEm: 'desc' }
            }
          }
        }
      }
    })

    if (!table) {
      res.status(404).json({ error: 'Table not found' })
      return
    }

    res.json(table)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error fetching table details' })
  }
})

router.post('/:id/open', async (req, res) => {
  try {
    const { id } = req.params
    const mesaId = Number(id)
    const userId = (req as any).user.userId
    
    const existingComanda = await prisma.comanda.findFirst({
      where: { mesaId, status: 'ABERTA' }
    })
    
    if (existingComanda) {
      return res.json({ success: true, message: 'Table already open' })
    }

    await prisma.$transaction([
      prisma.mesa.update({
        where: { id: mesaId },
        data: { status: 'OCUPADA' }
      }),
      prisma.comanda.create({
        data: { mesaId, status: 'ABERTA', usuarioId: userId }
      })
    ])

    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Error opening table' })
  }
})

router.post('/:id/request-bill', async (req, res) => {
  try {
    const { id } = req.params
    await prisma.mesa.update({
      where: { id: Number(id) },
      data: { status: 'FECHAMENTO' }
    })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Error requesting bill' })
  }
})

router.post('/:id/print-partial', async (req, res) => {
  try {
    const { id } = req.params
    const table = await prisma.mesa.findUnique({
      where: { id: Number(id) },
      include: {
        comandas: {
          where: { status: 'ABERTA' },
          include: {
            pedidos: {
              include: {
                itens: {
                  include: {
                    produto: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!table || table.comandas.length === 0) {
      res.status(400).json({ error: 'Table not open or not found' })
      return
    }

    // Calculate bill details
    const comanda = table.comandas[0]
    const itemsMap = new Map<number, { 
      produto: string, 
      quantidade: number, 
      precoUnitario: number,
      total: number 
    }>()

    let subtotal = 0

    comanda.pedidos.forEach(p => {
      p.itens.forEach(i => {
        // Only include non-cancelled items if you have cancellation logic
        const current = itemsMap.get(i.produtoId) || {
          produto: i.produto.nome,
          quantidade: 0,
          precoUnitario: i.produto.preco,
          total: 0
        }
        
        current.quantidade += i.quantidade
        current.total += i.quantidade * i.produto.preco
        itemsMap.set(i.produtoId, current)
        
        subtotal += i.quantidade * i.produto.preco
      })
    })
    
    const items = Array.from(itemsMap.values())
    const servico = subtotal * 0.1 // 10% service charge
    const totalFinal = subtotal + servico

    // Send to Printer
    printerService.printBill({
      mesa: table.numero,
      data: new Date(),
      itens: items,
      subtotal,
      servico,
      totalFinal
    })
    
    console.log(`[PRINTER] Printing partial bill for Table ${table.numero}`)
    
    res.json({ success: true, message: 'Partial bill sent to printer' })
  } catch (error) {
    console.error('Error printing partial bill:', error)
    res.status(500).json({ error: 'Error printing partial bill' })
  }
})

router.post('/:id/reopen', async (req, res) => {
  try {
    const { id } = req.params
    await prisma.mesa.update({
      where: { id: Number(id) },
      data: { status: 'OCUPADA' }
    })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Error reopening table' })
  }
})

router.post('/:id/close', requireRole(['ADMIN', 'DONO', 'GERENTE', 'CAIXA']), async (req, res) => {
  try {
    const { id } = req.params
    const mesaId = Number(id)
    
    // Find open comanda
    const comanda = await prisma.comanda.findFirst({
      where: { mesaId, status: 'ABERTA' },
      include: {
        pedidos: {
          include: {
            itens: {
              include: {
                produto: true
              }
            }
          }
        }
      }
    })

    if (!comanda) {
      res.status(404).json({ error: 'Nenhuma comanda aberta para esta mesa' })
      return
    }

    // Calculate total
    let subtotal = 0
    comanda.pedidos.forEach(p => {
      p.itens.forEach(i => {
        subtotal += i.quantidade * i.produto.preco
      })
    })
    
    const servico = subtotal * 0.1
    const totalFinal = subtotal + servico

    // Close comanda and free table in a transaction
    await prisma.$transaction([
      prisma.comanda.update({
        where: { id: comanda.id },
        data: {
          status: 'FECHADA',
          fechadaEm: new Date(),
          total: totalFinal
        }
      }),
      prisma.mesa.update({
        where: { id: mesaId },
        data: { status: 'LIVRE' }
      })
    ])

    res.json({ success: true, total: totalFinal })
  } catch (error) {
    console.error('Error closing table:', error)
    res.status(500).json({ error: 'Error closing table' })
  }
})

export default router
