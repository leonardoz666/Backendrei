"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrderSchema = void 0;
const zod_1 = require("zod");
exports.createOrderSchema = zod_1.z.object({
    mesaId: zod_1.z.number({ message: 'Mesa é obrigatória' }).int().positive(),
    itens: zod_1.z.array(zod_1.z.object({
        produtoId: zod_1.z.number().int().positive(),
        quantidade: zod_1.z.number().int().positive().min(1),
        observacao: zod_1.z.string().optional()
    })).min(1, 'O pedido deve ter pelo menos um item')
});
