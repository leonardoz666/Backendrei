"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../lib/auth");
const auth_2 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_2.authenticate);
router.use((0, auth_2.requireRole)(['DONO', 'ADMIN']));
router.get('/', async (req, res) => {
    try {
        const users = await prisma_1.prisma.usuario.findMany({
            select: { id: true, nome: true, login: true, role: true }
        });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching users' });
    }
});
router.post('/', async (req, res) => {
    try {
        const { nome, login, role, senha } = req.body;
        if (!nome || !login || !role || !senha) {
            res.status(400).json({ error: 'Invalid data' });
            return;
        }
        const hashedPassword = await (0, auth_1.hashPassword)(senha);
        const user = await prisma_1.prisma.usuario.create({
            data: { nome, login, role, senha: hashedPassword }
        });
        res.json({ success: true, user: { id: user.id, nome: user.nome, login: user.login, role: user.role } });
    }
    catch (error) {
        if (error.message?.includes('Unique constraint')) {
            res.status(409).json({ error: 'Login already exists' });
            return;
        }
        res.status(500).json({ error: 'Error creating user' });
    }
});
// Update user
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, login, role, senha } = req.body;
        const updateData = { nome, login, role };
        if (senha) {
            updateData.senha = await (0, auth_1.hashPassword)(senha);
        }
        const user = await prisma_1.prisma.usuario.update({
            where: { id: Number(id) },
            data: updateData,
            select: { id: true, nome: true, login: true, role: true }
        });
        res.json({ success: true, user });
    }
    catch (error) {
        res.status(500).json({ error: 'Error updating user' });
    }
});
// Delete user
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Prevent deleting self
        if (req.user?.userId === Number(id)) {
            res.status(400).json({ error: 'Cannot delete yourself' });
            return;
        }
        await prisma_1.prisma.usuario.delete({
            where: { id: Number(id) }
        });
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: 'Error deleting user' });
    }
});
exports.default = router;
