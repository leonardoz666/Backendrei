"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const order_1 = require("../schemas/order");
const OrderService_1 = require("../services/OrderService");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/', (0, validate_1.validate)(order_1.createOrderSchema), async (req, res, next) => {
    try {
        const { mesaId, itens } = req.body;
        const userId = req.user.userId;
        const userName = req.user?.name;
        const result = await OrderService_1.orderService.createOrder({
            mesaId,
            itens,
            userId,
            userName
        });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.delete('/items/:id', async (req, res, next) => {
    try {
        const itemId = Number(req.params.id);
        const { userId, role } = req.user;
        await OrderService_1.orderService.cancelItem(itemId, userId, role);
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
