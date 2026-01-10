"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const socket_1 = require("../lib/socket");
const validate_1 = require("../middleware/validate");
const order_1 = require("../schemas/order");
const PrinterService_1 = require("../services/PrinterService");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/', (0, validate_1.validate)(order_1.createOrderSchema), async (req, res) => {
    try {
        const { mesaId, itens } = req.body;
        if (!mesaId || !itens || itens.length === 0) {
            res.status(400).json({ error: 'Invalid data' });
            return;
        }
        let comanda = await prisma_1.prisma.comanda.findFirst({
            where: { mesaId, status: 'ABERTA' }
        });
        if (!comanda) {
            const mesa = await prisma_1.prisma.mesa.findUnique({ where: { id: mesaId } });
            if (!mesa) {
                res.status(404).json({ error: 'Table not found' });
                return;
            }
            await prisma_1.prisma.mesa.update({ where: { id: mesaId }, data: { status: 'OCUPADA' } });
            comanda = await prisma_1.prisma.comanda.create({ data: { mesaId, status: 'ABERTA' } });
        }
        const userId = req.user.userId;
        const pedido = await prisma_1.prisma.pedido.create({
            data: {
                comandaId: comanda.id,
                garcomId: userId,
                status: 'ABERTO'
            }
        });
        let totalPedido = 0;
        const productionOrders = {};
        for (const item of itens) {
            const produto = await prisma_1.prisma.produto.findUnique({
                where: { id: item.produtoId },
                include: { categoria: true }
            });
            if (!produto)
                continue;
            totalPedido += produto.preco * item.quantidade;
            const pedidoItem = await prisma_1.prisma.pedidoItem.create({
                data: {
                    pedidoId: pedido.id,
                    produtoId: item.produtoId,
                    quantidade: item.quantidade,
                    observacao: item.observacao,
                    status: 'PENDENTE'
                }
            });
            const sector = produto.categoria?.setor || (produto.isDrink ? 'BAR' : 'COZINHA');
            if (!productionOrders[sector])
                productionOrders[sector] = [];
            productionOrders[sector].push(pedidoItem.id);
        }
        await prisma_1.prisma.comanda.update({
            where: { id: comanda.id },
            data: { total: { increment: totalPedido } }
        });
        for (const [sector, items] of Object.entries(productionOrders)) {
            const ordem = await prisma_1.prisma.ordemProducao.create({
                data: {
                    pedidoId: pedido.id,
                    setor: sector,
                    status: 'RECEBIDO'
                }
            });
            for (const item of items) {
                await prisma_1.prisma.ordemItem.create({
                    data: {
                        ordemProducaoId: ordem.id,
                        pedidoItemId: item
                    }
                });
            }
            // Fetch full order to emit via Socket.io
            const fullOrder = await prisma_1.prisma.ordemProducao.findUnique({
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
            });
            try {
                (0, socket_1.getIO)().emit('new-kitchen-order', fullOrder);
                // Send to Printer
                if (fullOrder) {
                    PrinterService_1.printerService.printOrderTicket(sector, {
                        mesa: fullOrder.pedido.comanda.mesa.numero,
                        garcom: req.user?.name || 'Garçom',
                        pedidoId: fullOrder.pedido.id,
                        data: fullOrder.criadaEm,
                        itens: fullOrder.itens.map(i => ({
                            quantidade: i.pedidoItem.quantidade,
                            produto: i.pedidoItem.produto.nome,
                            observacao: i.pedidoItem.observacao
                        }))
                    });
                }
            }
            catch (e) {
                console.error('Socket/Printer error:', e);
            }
        }
        res.json({ success: true, comandaId: comanda.id, pedidoId: pedido.id });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating order' });
    }
});
exports.default = router;
