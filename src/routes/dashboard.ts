import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Helper to get date ranges
const getDateRanges = () => {
    const now = new Date()

    // Today
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    // Yesterday
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)

    const yesterdayEnd = new Date(todayEnd)
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1)

    // Week
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 7)

    // Last week
    const lastWeekEnd = new Date(weekStart)
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1)

    const lastWeekStart = new Date(lastWeekEnd)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)

    // Month
    const monthStart = new Date(todayStart)
    monthStart.setDate(1)

    return {
        todayStart,
        todayEnd,
        yesterdayStart,
        yesterdayEnd,
        weekStart,
        lastWeekStart,
        lastWeekEnd,
        monthStart
    }
}

// Get stats for a period
const getStatsForPeriod = async (startDate: Date, endDate: Date) => {
    const comandas = await prisma.comanda.findMany({
        where: {
            abertaEm: {
                gte: startDate,
                lte: endDate
            }
        },
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

    let total = 0
    let orderCount = 0
    const tableIds = new Set<number>()

    comandas.forEach(comanda => {
        tableIds.add(comanda.mesaId)
        comanda.pedidos.forEach(pedido => {
            orderCount++
            pedido.itens.forEach(item => {
                if (item.status !== 'CANCELADO') {
                    total += item.produto.preco * item.quantidade
                }
            })
        })
    })

    return {
        total,
        orders: orderCount,
        avgTicket: orderCount > 0 ? total / orderCount : 0,
        tables: tableIds.size
    }
}

// Get top products
const getTopProducts = async (startDate: Date, endDate: Date, limit = 10) => {
    const items = await prisma.pedidoItem.findMany({
        where: {
            status: { not: 'CANCELADO' },
            pedido: {
                criadoEm: {
                    gte: startDate,
                    lte: endDate
                }
            }
        },
        include: {
            produto: true
        }
    })

    const productMap = new Map<string, { name: string, quantity: number, revenue: number }>()

    items.forEach(item => {
        const existing = productMap.get(item.produto.nome) || { name: item.produto.nome, quantity: 0, revenue: 0 }
        existing.quantity += item.quantidade
        existing.revenue += item.produto.preco * item.quantidade
        productMap.set(item.produto.nome, existing)
    })

    return Array.from(productMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, limit)
}

// Get hourly sales for today
const getHourlySales = async (todayStart: Date, todayEnd: Date) => {
    const hours = []
    for (let h = 10; h <= 22; h++) {
        hours.push({ hour: `${h}h`, total: 0 })
    }

    const items = await prisma.pedidoItem.findMany({
        where: {
            status: { not: 'CANCELADO' },
            pedido: {
                criadoEm: {
                    gte: todayStart,
                    lte: todayEnd
                }
            }
        },
        include: {
            produto: true,
            pedido: true
        }
    })

    items.forEach(item => {
        const hour = new Date(item.pedido.criadoEm).getHours()
        const idx = hour - 10
        if (idx >= 0 && idx < hours.length) {
            hours[idx].total += item.produto.preco * item.quantidade
        }
    })

    return hours
}

router.get('/stats', async (_req: Request, res: Response) => {
    try {
        const dates = getDateRanges()

        // Get stats for different periods
        const [todayStats, yesterdayStats, weekStats, lastWeekStats, monthStats] = await Promise.all([
            getStatsForPeriod(dates.todayStart, dates.todayEnd),
            getStatsForPeriod(dates.yesterdayStart, dates.yesterdayEnd),
            getStatsForPeriod(dates.weekStart, dates.todayEnd),
            getStatsForPeriod(dates.lastWeekStart, dates.lastWeekEnd),
            getStatsForPeriod(dates.monthStart, dates.todayEnd)
        ])

        // Get top products
        const topProducts = await getTopProducts(dates.todayStart, dates.todayEnd)

        // Get hourly sales
        const hourlySales = await getHourlySales(dates.todayStart, dates.todayEnd)

        // Calculate comparisons
        const todayVsYesterday = yesterdayStats.total > 0
            ? Math.round(((todayStats.total - yesterdayStats.total) / yesterdayStats.total) * 100)
            : 0

        const weekVsLastWeek = lastWeekStats.total > 0
            ? Math.round(((weekStats.total - lastWeekStats.total) / lastWeekStats.total) * 100)
            : 0

        res.json({
            today: todayStats,
            week: weekStats,
            month: monthStats,
            topProducts,
            hourlySales,
            comparison: {
                todayVsYesterday,
                weekVsLastWeek
            }
        })
    } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        res.status(500).json({ error: 'Erro ao buscar estatísticas' })
    }
})

export default router
