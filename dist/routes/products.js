"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const upload_1 = require("../lib/upload");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// List all products
router.get('/', async (req, res) => {
    try {
        const products = await prisma_1.prisma.produto.findMany({
            include: { categoria: true },
            orderBy: { nome: 'asc' }
        });
        res.json(products);
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching products' });
    }
});
// Create product (Admin/Dono only)
router.post('/', (0, auth_1.requireRole)(['ADMIN', 'DONO']), async (req, res) => {
    try {
        const { nome, preco, categoriaId, ativo, foto, tipoOpcao, sabores, isDrink, favorito } = req.body;
        if (!nome) {
            res.status(400).json({ error: 'Nome do produto é obrigatório' });
            return;
        }
        const product = await prisma_1.prisma.produto.create({
            data: {
                nome,
                preco: Number(preco) || 0,
                categoriaId: categoriaId ? Number(categoriaId) : undefined,
                ativo: ativo ?? true,
                foto,
                tipoOpcao: tipoOpcao || 'padrao',
                sabores: typeof sabores === 'object' ? JSON.stringify(sabores) : sabores,
                isDrink: !!isDrink,
                favorito: !!favorito
            },
            include: { categoria: true }
        });
        res.status(201).json(product);
    }
    catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({
            error: 'Error creating product',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
// Update product (Admin/Dono only)
router.put('/:id', (0, auth_1.requireRole)(['ADMIN', 'DONO']), upload_1.upload.single('foto'), async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, preco, categoriaId, tipoOpcao, sabores } = req.body;
        // Parse boolean fields
        const ativo = req.body.ativo === 'true' || req.body.ativo === true;
        const isDrink = req.body.isDrink === 'true' || req.body.isDrink === true;
        const favorito = req.body.favorito === 'true' || req.body.favorito === true;
        let foto = req.body.foto;
        if (req.file) {
            foto = `/uploads/${req.file.filename}`;
        }
        const product = await prisma_1.prisma.produto.update({
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
                favorito
            },
            include: { categoria: true }
        });
        res.json(product);
    }
    catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({
            error: 'Error updating product',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
// Delete product (Admin/Dono only)
router.delete('/:id', (0, auth_1.requireRole)(['ADMIN', 'DONO']), async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.produto.delete({
            where: { id: Number(id) }
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Delete product error:', error);
        // Check for foreign key constraint (P2003) - Handle as soft delete
        // Also checking code property directly in case instanceof fails
        if ((error?.code === 'P2003') || (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2003')) {
            try {
                await prisma_1.prisma.produto.update({
                    where: { id: Number(req.params.id) },
                    data: { ativo: false }
                });
                res.status(200).json({ message: 'Produto desativado pois possui histórico de vendas.' });
                return;
            }
            catch (updateError) {
                console.error('Soft delete error:', updateError);
                res.status(500).json({ error: 'Falha ao desativar produto' });
                return;
            }
        }
        res.status(500).json({
            error: 'Error deleting product',
            details: error instanceof Error ? error.message : String(error),
            code: error?.code
        });
    }
});
exports.default = router;
