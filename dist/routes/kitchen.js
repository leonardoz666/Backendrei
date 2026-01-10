"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const socket_1 = require("../lib/socket");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use((0, auth_1.requireRole)(['GERENTE', 'DONO', 'CAIXA', 'GARCOM']));
router.get('/', async (req, res) => {
    try {
        const orders = await prisma_1.prisma.ordemProducao.findMany({
            where: { status: { not: 'PRONTO' } },
            include: {
                pedido: { include: { comanda: { include: { mesa: true } } } },
                itens: { include: { pedidoItem: { include: { produto: true } } } }
            },
            orderBy: { criadaEm: 'asc' }
        });
        res.json(orders);
    }
    catch {
        res.status(500).json({ error: 'Error fetching kitchen orders' });
    }
});
router.put('/', async (req, res) => {
    try {
        const { id, status } = req.body;
        if (!id || !status) {
            res.status(400).json({ error: 'Invalid data' });
            return;
        }
        const updated = await prisma_1.prisma.ordemProducao.update({ where: { id }, data: { status } });
        try {
            (0, socket_1.getIO)().emit('kitchen-order-updated', { id: updated.id, status: updated.status });
        }
        catch (e) {
            console.error('Socket emit error:', e);
        }
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ error: 'Error updating order' });
    }
});
exports.default = router;
