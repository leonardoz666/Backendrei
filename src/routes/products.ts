import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole } from '../middleware/auth'
import { Prisma } from '@prisma/client'
import { upload } from '../lib/upload'

const router = Router()
router.use(authenticate)

// List all products
router.get('/', async (req, res) => {
  try {
    const products = await prisma.produto.findMany({
      include: { categoria: true },
      orderBy: { nome: 'asc' }
    })
    res.json(products)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching products' })
  }
})

// Create product (Admin/Dono only)
router.post('/', requireRole(['ADMIN', 'DONO']), upload.single('foto'), async (req: Request, res: Response) => {
  try {
    const { nome, preco, categoriaId, ativo, tipoOpcao, sabores, isDrink, isFood, favorito, permitirObservacao, permiteGeloLimao } = req.body
    
    if (!nome) {
      res.status(400).json({ error: 'Nome do produto é obrigatório' })
      return
    }

    let foto = req.body.foto
    if (req.file) {
      foto = `/uploads/${req.file.filename}`
    }

    const product = await prisma.produto.create({
      data: {
        nome,
        preco: Number(preco) || 0,
        categoriaId: categoriaId ? Number(categoriaId) : undefined,
        ativo: ativo === 'true' || ativo === true,
        foto,
        tipoOpcao: tipoOpcao || 'padrao',
        sabores: typeof sabores === 'string' && sabores.startsWith('[') ? sabores : (typeof sabores === 'object' ? JSON.stringify(sabores) : sabores),
        isDrink: isDrink === 'true' || isDrink === true,
        isFood: isFood === undefined ? true : (isFood === 'true' || isFood === true),
        favorito: favorito === 'true' || favorito === true,
        permitirObservacao: permitirObservacao === undefined ? true : (permitirObservacao === 'true' || permitirObservacao === true),
        permiteGeloLimao: permiteGeloLimao === 'true' || permiteGeloLimao === true
      } as any,
      include: { categoria: true }
    })
    res.status(201).json(product)
  } catch (error: any) {
    console.error('Create product error:', error)
    res.status(500).json({ 
      error: 'Error creating product', 
      details: error instanceof Error ? error.message : String(error)
    })
  }
})

// Update product (Admin/Dono only)
router.put('/:id', requireRole(['ADMIN', 'DONO']), upload.single('foto'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { nome, preco, categoriaId, tipoOpcao, sabores } = req.body

    // Parse boolean fields
    const ativo = req.body.ativo === 'true' || req.body.ativo === true
    const isDrink = req.body.isDrink === 'true' || req.body.isDrink === true
    const isFood = req.body.isFood === undefined ? undefined : (req.body.isFood === 'true' || req.body.isFood === true)
    const favorito = req.body.favorito === 'true' || req.body.favorito === true
    const permitirObservacao = req.body.permitirObservacao === undefined ? undefined : (req.body.permitirObservacao === 'true' || req.body.permitirObservacao === true)
    const permiteGeloLimao = req.body.permiteGeloLimao === undefined ? undefined : (req.body.permiteGeloLimao === 'true' || req.body.permiteGeloLimao === true)

    let foto = req.body.foto
    if (req.file) {
      foto = `/uploads/${req.file.filename}`
    }

    const product = await prisma.produto.update({
      where: { id: Number(id) },
      data: {
        nome,
        preco: Number(preco) || 0,
        categoriaId: categoriaId ? Number(categoriaId) : undefined,
        ativo,
        foto,
        tipoOpcao,
        sabores: typeof sabores === 'string' && sabores.startsWith('[') ? sabores : (typeof sabores === 'object' ? JSON.stringify(sabores) : sabores),
        isDrink,
        isFood,
        favorito,
        permitirObservacao,
        permiteGeloLimao
      } as any,
      include: { categoria: true }
    })
    res.json(product)
  } catch (error: any) {
    console.error('Update product error:', error)
    res.status(500).json({ 
      error: 'Error updating product',
      details: error instanceof Error ? error.message : String(error)
    })
  }
})

// Delete product (Admin/Dono only)
router.delete('/:id', requireRole(['ADMIN', 'DONO']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await prisma.produto.delete({
      where: { id: Number(id) }
    })
    res.status(204).send()
  } catch (error: any) {
    console.error('Delete product error:', error)
    
    // Check for foreign key constraint (P2003) - Handle as soft delete
    // Also checking code property directly in case instanceof fails
    if ((error?.code === 'P2003') || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003')) {
      try {
        await prisma.produto.update({
          where: { id: Number(req.params.id) },
          data: { ativo: false }
        })
        res.status(200).json({ message: 'Produto desativado pois possui histórico de vendas.' })
        return
      } catch (updateError) {
        console.error('Soft delete error:', updateError)
        res.status(500).json({ error: 'Falha ao desativar produto' })
        return
      }
    }
    
    res.status(500).json({ 
      error: 'Error deleting product', 
      details: error instanceof Error ? error.message : String(error),
      code: error?.code 
    })
  }
})

export default router
