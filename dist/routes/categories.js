"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// List all categories
router.get('/', async (req, res) => {
    try {
        const categories = await prisma_1.prisma.categoria.findMany({
            include: {
                produtos: {
                    where: { ativo: true }
                }
            },
            orderBy: { nome: 'asc' }
        });
        res.json(categories);
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching categories' });
    }
});
// Create category (Admin/Dono only)
router.post('/', (0, auth_1.requireRole)(['ADMIN', 'DONO']), async (req, res) => {
    try {
        const { nome, setor } = req.body;
        if (!nome || !setor) {
            res.status(400).json({ error: 'Name and Sector are required' });
            return;
        }
        const category = await prisma_1.prisma.categoria.create({
            data: { nome, setor }
        });
        res.status(201).json(category);
    }
    catch (error) {
        res.status(500).json({ error: 'Error creating category' });
    }
});
// Update category (Admin/Dono only)
router.put('/:id', (0, auth_1.requireRole)(['ADMIN', 'DONO']), async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, setor } = req.body;
        const category = await prisma_1.prisma.categoria.update({
            where: { id: Number(id) },
            data: { nome, setor }
        });
        res.json(category);
    }
    catch (error) {
        res.status(500).json({ error: 'Error updating category' });
    }
});
// Delete category (Admin/Dono only)
router.delete('/:id', (0, auth_1.requireRole)(['ADMIN', 'DONO']), async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.categoria.delete({
            where: { id: Number(id) }
        });
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: 'Error deleting category' });
    }
});
exports.default = router;
