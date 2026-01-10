"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const PrinterService_1 = require("../services/PrinterService");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', async (req, res) => {
    try {
        const tables = await prisma_1.prisma.mesa.findMany({
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
        });
        res.json(tables);
    }
    catch {
        res.status(500).json({ error: 'Error fetching tables' });
    }
});
router.get('/my/opened', async (req, res) => {
    try {
        const userId = req.user.id;
        const tables = await prisma_1.prisma.mesa.findMany({
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
        });
        res.json(tables);
    }
    catch {
        res.status(500).json({ error: 'Error fetching my tables' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const table = await prisma_1.prisma.mesa.findUnique({
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
        });
        if (!table) {
            res.status(404).json({ error: 'Table not found' });
            return;
        }
        res.json(table);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching table details' });
    }
});
router.post('/:id/open', async (req, res) => {
    try {
        const { id } = req.params;
        const mesaId = Number(id);
        const userId = req.user.id;
        const existingComanda = await prisma_1.prisma.comanda.findFirst({
            where: { mesaId, status: 'ABERTA' }
        });
        if (existingComanda) {
            return res.json({ success: true, message: 'Table already open' });
        }
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.mesa.update({
                where: { id: mesaId },
                data: { status: 'OCUPADA' }
            }),
            prisma_1.prisma.comanda.create({
                data: { mesaId, status: 'ABERTA', usuarioId: userId }
            })
        ]);
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ error: 'Error opening table' });
    }
});
router.post('/:id/request-bill', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.mesa.update({
            where: { id: Number(id) },
            data: { status: 'FECHAMENTO' }
        });
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ error: 'Error requesting bill' });
    }
});
router.post('/:id/print-partial', async (req, res) => {
    try {
        const { id } = req.params;
        const table = await prisma_1.prisma.mesa.findUnique({
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
        });
        if (!table || table.comandas.length === 0) {
            res.status(400).json({ error: 'Table not open or not found' });
            return;
        }
        // Calculate bill details
        const comanda = table.comandas[0];
        const itemsMap = new Map();
        let subtotal = 0;
        comanda.pedidos.forEach(p => {
            p.itens.forEach(i => {
                // Only include non-cancelled items if you have cancellation logic
                const current = itemsMap.get(i.produtoId) || {
                    produto: i.produto.nome,
                    quantidade: 0,
                    precoUnitario: i.produto.preco,
                    total: 0
                };
                current.quantidade += i.quantidade;
                current.total += i.quantidade * i.produto.preco;
                itemsMap.set(i.produtoId, current);
                subtotal += i.quantidade * i.produto.preco;
            });
        });
        const items = Array.from(itemsMap.values());
        const servico = subtotal * 0.1; // 10% service charge
        const totalFinal = subtotal + servico;
        // Send to Printer
        PrinterService_1.printerService.printBill({
            mesa: table.numero,
            data: new Date(),
            itens: items,
            subtotal,
            servico,
            totalFinal
        });
        console.log(`[PRINTER] Printing partial bill for Table ${table.numero}`);
        res.json({ success: true, message: 'Partial bill sent to printer' });
    }
    catch (error) {
        console.error('Error printing partial bill:', error);
        res.status(500).json({ error: 'Error printing partial bill' });
    }
});
router.post('/:id/reopen', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.mesa.update({
            where: { id: Number(id) },
            data: { status: 'OCUPADA' }
        });
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ error: 'Error reopening table' });
    }
});
exports.default = router;
