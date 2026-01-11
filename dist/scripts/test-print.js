"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const PrinterService_1 = require("../services/PrinterService");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('--- Printer Configuration Check ---');
    const configs = await prisma.printerConfig.findMany();
    if (configs.length === 0) {
        console.log('No printer configurations found in database.');
        // Seed default config if missing? No, better just report.
    }
    else {
        configs.forEach(c => {
            console.log(`[${c.setor}] ${c.name} - IP: ${c.ip}:${c.port} - Enabled: ${c.enabled}`);
        });
    }
    console.log('-----------------------------------');
    const testData = {
        mesa: 99,
        garcom: 'Teste Sistema',
        pedidoId: 12345,
        data: new Date(),
        itens: [
            {
                quantidade: 1,
                produto: 'TESTE DE IMPRESSÃO',
                observacao: 'Verificar alinhamento'
            },
            {
                quantidade: 2,
                produto: 'Produto Exemplo',
                observacao: null
            }
        ]
    };
    console.log('\n--- Sending Test Print to KITCHEN (COZINHA) ---');
    await PrinterService_1.printerService.printOrderTicket('COZINHA', testData);
    console.log('\n--- Sending Test Print to BAR (BAR) ---');
    await PrinterService_1.printerService.printOrderTicket('BAR', testData);
    console.log('\nTest execution finished.');
}
main()
    .catch(e => console.error(e))
    .finally(async () => {
    await prisma.$disconnect();
});
