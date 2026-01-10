"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../lib/auth");
const auth_2 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const auth_3 = require("../schemas/auth");
const router = (0, express_1.Router)();
router.post('/login', (0, validate_1.validate)(auth_3.loginSchema), async (req, res) => {
    try {
        const { login, senha } = req.body;
        const user = await prisma_1.prisma.usuario.findUnique({ where: { login } });
        if (!user || !(await (0, auth_1.comparePassword)(senha, user.senha))) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const token = (0, auth_1.signToken)({ userId: user.id, role: user.role, name: user.nome });
        // Set cookie on response
        // When proxied by Next.js, this cookie will be passed to the browser
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 8 * 60 * 60 * 1000, // 8 hours
            path: '/'
        });
        res.json({ success: true, user: { name: user.nome, role: user.role } });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/logout', (req, res) => {
    res.clearCookie('token', { path: '/' });
    res.json({ success: true });
});
router.get('/me', auth_2.authenticate, (req, res) => {
    res.json({ user: req.user });
});
exports.default = router;
