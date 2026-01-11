import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { createOrderSchema } from '../schemas/order'
import { orderService } from '../services/OrderService'

const router = Router()
router.use(authenticate)

router.post('/', validate(createOrderSchema), async (req: AuthRequest, res, next) => {
  try {
    const { mesaId, itens } = req.body
    const userId = req.user!.userId
    const userName = req.user?.name

    const result = await orderService.createOrder({
      mesaId,
      itens,
      userId,
      userName
    })

    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.delete('/items/:id', async (req: AuthRequest, res, next) => {
  try {
    const itemId = Number(req.params.id)
    const { userId, role } = req.user!
    
    await orderService.cancelItem(itemId, userId, role)
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

export default router
