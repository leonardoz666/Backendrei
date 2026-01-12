"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const zod_1 = require("zod");
const PrinterService_1 = require("../services/PrinterService");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use((0, auth_1.requireRole)(['DONO']));
// Get all printers
router.get('/', async (req, res) => {
    try {
        const printers = await prisma_1.prisma.printerConfig.findMany();
        res.json(printers);
    }
    catch (error) {
        console.error('Error fetching printers:', error);
        res.status(500).json({ error: 'Error fetching printers' });
    }
});
// Update printer
const updatePrinterSchema = zod_1.z.object({
    ip: zod_1.z.string().regex(/^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/, { message: 'Invalid IP address' }),
    port: zod_1.z.number().int().positive(),
    enabled: zod_1.z.boolean()
});
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = updatePrinterSchema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({ error: result.error.issues });
            return;
        }
        const updated = await prisma_1.prisma.printerConfig.update({
            where: { id: Number(id) },
            data: result.data
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating printer:', error);
        res.status(500).json({ error: 'Error updating printer' });
    }
});
// Test printer
router.post('/:id/test', async (req, res) => {
    try {
        const { id } = req.params;
        const printer = await prisma_1.prisma.printerConfig.findUnique({ where: { id: Number(id) } });
        if (!printer) {
            res.status(404).json({ error: 'Printer not found' });
            return;
        }
        const success = await PrinterService_1.printerService.testPrinter(printer.ip, printer.port);
        if (success) {
            res.json({ message: 'Teste enviado com sucesso!' });
        }
        else {
            res.status(500).json({ error: 'Falha ao conectar com a impressora' });
        }
    }
    catch (error) {
        console.error('Error testing printer:', error);
        res.status(500).json({ error: 'Erro ao testar impressora' });
    }
});
exports.default = router;
