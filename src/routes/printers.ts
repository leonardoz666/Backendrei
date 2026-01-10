import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole } from '../middleware/auth'
import { z } from 'zod'

const router = Router()
router.use(authenticate)
router.use(requireRole(['DONO']))

// Get all printers
router.get('/', async (req, res) => {
  try {
    const printers = await prisma.printerConfig.findMany()
    res.json(printers)
  } catch (error) {
    console.error('Error fetching printers:', error)
    res.status(500).json({ error: 'Error fetching printers' })
  }
})

// Update printer
const updatePrinterSchema = z.object({
  ip: z.string().regex(/^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/, { message: 'Invalid IP address' }),
  port: z.number().int().positive(),
  enabled: z.boolean()
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = updatePrinterSchema.safeParse(req.body)
    
    if (!result.success) {
      res.status(400).json({ error: result.error.issues })
      return
    }

    const updated = await prisma.printerConfig.update({
      where: { id: Number(id) },
      data: result.data
    })

    res.json(updated)
  } catch (error) {
    console.error('Error updating printer:', error)
    res.status(500).json({ error: 'Error updating printer' })
  }
})

export default router
