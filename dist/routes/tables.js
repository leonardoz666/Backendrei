"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const PrinterService_1 = require("../services/PrinterService");
const socket_1 = require("../lib/socket");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Create table (Admin/Dono only)
router.post('/', (0, auth_1.requireRole)(['ADMIN', 'DONO']), async (req, res) => {
    try {
        let { numero } = req.body;
        if (numero) {
            // Check if table number already exists
            const existing = await prisma_1.prisma.mesa.findUnique({
                where: { numero: Number(numero) }
            });
            if (existing) {
                res.status(409).json({ error: 'Mesa já existe' });
                return;
            }
        }
        else {
            // Auto-increment fallback
            const highestMesa = await prisma_1.prisma.mesa.findFirst({
                orderBy: { numero: 'desc' }
            });
            numero = (highestMesa?.numero || 0) + 1;
        }
        const mesa = await prisma_1.prisma.mesa.create({
            data: {
                numero: Number(numero),
                status: 'LIVRE'
            }
        });
        res.json(mesa);
    }
    catch {
        res.status(500).json({ error: 'Error creating table' });
    }
});
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
        const userId = req.user.userId;
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
                                        produto: {
                                            select: {
                                                nome: true,
                                                preco: true
                                            }
                                        }
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
        const userId = req.user.userId;
        if (!userId) {
            res.status(401).json({ error: 'User ID not found in session' });
            return;
        }
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
router.post('/:id/close', (0, auth_1.requireRole)(['ADMIN', 'DONO', 'GERENTE', 'CAIXA']), async (req, res) => {
    try {
        const { id } = req.params;
        const mesaId = Number(id);
        // Find open comanda
        const comanda = await prisma_1.prisma.comanda.findFirst({
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
        });
        if (!comanda) {
            res.status(404).json({ error: 'Nenhuma comanda aberta para esta mesa' });
            return;
        }
        // Calculate total
        let subtotal = 0;
        comanda.pedidos.forEach(p => {
            p.itens.forEach(i => {
                subtotal += i.quantidade * i.produto.preco;
            });
        });
        const servico = subtotal * 0.1;
        const totalFinal = subtotal + servico;
        // Close comanda and free table in a transaction
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.comanda.update({
                where: { id: comanda.id },
                data: {
                    status: 'FECHADA',
                    fechadaEm: new Date(),
                    total: totalFinal
                }
            }),
            prisma_1.prisma.mesa.update({
                where: { id: mesaId },
                data: { status: 'LIVRE' }
            })
        ]);
        res.json({ success: true, total: totalFinal });
    }
    catch (error) {
        console.error('Error closing table:', error);
        res.status(500).json({ error: 'Error closing table' });
    }
});
router.post('/:id/transfer', async (req, res) => {
    try {
        const { id } = req.params;
        const { targetTableId } = req.body;
        const sourceTableId = Number(id);
        const targetId = Number(targetTableId);
        if (!targetId) {
            res.status(400).json({ error: 'Target table ID is required' });
            return;
        }
        // Find source table and open comanda
        const sourceTable = await prisma_1.prisma.mesa.findUnique({
            where: { id: sourceTableId },
            include: {
                comandas: {
                    where: { status: 'ABERTA' }
                }
            }
        });
        if (!sourceTable) {
            res.status(404).json({ error: 'Source table not found' });
            return;
        }
        if (sourceTable.comandas.length === 0) {
            res.status(400).json({ error: 'Source table has no open comanda' });
            return;
        }
        const comanda = sourceTable.comandas[0];
        // Find target table
        const targetTable = await prisma_1.prisma.mesa.findUnique({
            where: { id: targetId },
            include: {
                comandas: {
                    where: { status: 'ABERTA' }
                }
            }
        });
        if (!targetTable) {
            res.status(404).json({ error: 'Target table not found' });
            return;
        }
        if (targetTable.comandas.length > 0) {
            res.status(400).json({ error: 'Target table is already occupied' });
            return;
        }
        // Perform transfer
        await prisma_1.prisma.$transaction([
            // Update source table to LIVRE
            prisma_1.prisma.mesa.update({
                where: { id: sourceTableId },
                data: { status: 'LIVRE' }
            }),
            // Update target table to OCUPADA
            prisma_1.prisma.mesa.update({
                where: { id: targetId },
                data: { status: 'OCUPADA' }
            }),
            // Update comanda to point to target table
            prisma_1.prisma.comanda.update({
                where: { id: comanda.id },
                data: { mesaId: targetId }
            })
        ]);
        try {
            (0, socket_1.getIO)().emit('tables-updated');
        }
        catch (e) {
            console.error('Socket emit error:', e);
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error transferring table:', error);
        res.status(500).json({ error: 'Error transferring table' });
    }
});
exports.default = router;
