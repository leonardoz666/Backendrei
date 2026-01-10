import { z } from 'zod'

export const createOrderSchema = z.object({
  mesaId: z.number({ message: 'Mesa é obrigatória' }).int().positive(),
  itens: z.array(z.object({
    produtoId: z.number().int().positive(),
    quantidade: z.number().int().positive().min(1),
    observacao: z.string().optional()
  })).min(1, 'O pedido deve ter pelo menos um item')
})
