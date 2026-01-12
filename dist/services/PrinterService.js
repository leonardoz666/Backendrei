"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printerService = void 0;
const node_thermal_printer_1 = require("node-thermal-printer");
const prisma_1 = require("../lib/prisma");
class PrinterService {
    async getPrinter(ip, port = 9100) {
        return new node_thermal_printer_1.ThermalPrinter({
            type: node_thermal_printer_1.PrinterTypes.EPSON, // Padrão mais comum (ESC/POS)
            interface: `tcp://${ip}:${port}`,
            characterSet: node_thermal_printer_1.CharacterSet.PC860_PORTUGUESE,
            removeSpecialCharacters: false,
            lineCharacter: "-",
            width: 42, // Largura padrão (pode variar entre 40-48)
            options: {
                timeout: 3000 // Timeout de 3 segundos
            }
        });
    }
    async testPrinter(ip, port) {
        try {
            console.log(`[PRINTER] Testando conexão com ${ip}:${port}...`);
            const printer = await this.getPrinter(ip, port);
            const isConnected = await printer.isPrinterConnected();
            if (!isConnected) {
                console.warn(`[PRINTER] Impressora ${ip} não respondeu ao teste.`);
                return false;
            }
            printer.alignCenter();
            printer.bold(true);
            printer.println("TESTE DE IMPRESSÃO");
            printer.println("REI DO PIRÃO");
            printer.newLine();
            printer.println("Se você está lendo isso,");
            printer.println("a impressora está configurada corretamente!");
            printer.newLine();
            printer.println(new Date().toLocaleString('pt-BR'));
            printer.cut();
            await printer.execute();
            return true;
        }
        catch (error) {
            console.error(`[PRINTER] Erro no teste de impressão:`, error);
            return false;
        }
    }
    async printOrderTicket(sector, data) {
        const config = await prisma_1.prisma.printerConfig.findUnique({
            where: { setor: sector }
        });
        if (!config || !config.enabled) {
            console.log(`[PRINTER] Setor ${sector} não configurado ou desabilitado.`);
            return;
        }
        console.log(`[PRINTER] Tentando imprimir na ${config.name} (${config.ip})...`);
        try {
            const printer = await this.getPrinter(config.ip, config.port);
            const isConnected = await printer.isPrinterConnected();
            if (!isConnected) {
                console.warn(`[PRINTER] Impressora ${config.name} não respondeu.`);
                return;
            }
            printer.alignCenter();
            printer.bold(true);
            printer.setTextSize(1, 1);
            printer.println(`SETOR: ${sector}`);
            printer.newLine();
            printer.setTextSize(0, 0);
            printer.println(`MESA: ${data.mesa}  |  PEDIDO: #${data.pedidoId}`);
            printer.println(`GARÇOM: ${data.garcom}`);
            printer.println(`DATA: ${data.data.toLocaleString('pt-BR')}`);
            printer.drawLine();
            printer.alignLeft();
            data.itens.forEach(item => {
                printer.bold(true);
                printer.println(`${item.quantidade}x ${item.produto}`);
                printer.bold(false);
                if (item.observacao) {
                    printer.println(`   OBS: ${item.observacao}`);
                }
                printer.newLine();
            });
            printer.drawLine();
            printer.cut();
            await printer.execute();
            console.log(`[PRINTER] Impressão enviada com sucesso para ${config.name}`);
        }
        catch (error) {
            console.error(`[PRINTER] Erro ao imprimir no setor ${sector}:`, error);
        }
    }
    async printBill(data) {
        const config = await prisma_1.prisma.printerConfig.findUnique({
            where: { setor: 'CAIXA' }
        });
        if (!config || !config.enabled) {
            console.log(`[PRINTER] Impressora do Caixa não configurada ou desabilitada.`);
            return;
        }
        console.log(`[PRINTER] Tentando imprimir conta na ${config.name} (${config.ip})...`);
        try {
            const printer = await this.getPrinter(config.ip, config.port);
            const isConnected = await printer.isPrinterConnected();
            if (!isConnected) {
                console.warn(`[PRINTER] Impressora ${config.name} não respondeu.`);
                return;
            }
            printer.alignCenter();
            printer.bold(true);
            printer.println("REI DO PIRÃO");
            printer.bold(false);
            printer.println("Rua Exemplo, 123 - Cidade/UF");
            printer.println("CNPJ: 00.000.000/0001-00");
            printer.drawLine();
            printer.alignLeft();
            printer.println(`MESA: ${data.mesa}`);
            printer.println(`DATA: ${data.data.toLocaleString('pt-BR')}`);
            printer.drawLine();
            printer.tableCustom([
                { text: "QTD", align: "LEFT", width: 0.1 },
                { text: "ITEM", align: "LEFT", width: 0.5 },
                { text: "R$", align: "RIGHT", width: 0.2 },
                { text: "TOT", align: "RIGHT", width: 0.2 }
            ]);
            data.itens.forEach(item => {
                printer.tableCustom([
                    { text: item.quantidade.toString(), align: "LEFT", width: 0.1 },
                    { text: item.produto.substring(0, 18), align: "LEFT", width: 0.5 },
                    { text: item.precoUnitario.toFixed(2), align: "RIGHT", width: 0.2 },
                    { text: item.total.toFixed(2), align: "RIGHT", width: 0.2 }
                ]);
            });
            printer.drawLine();
            printer.alignRight();
            printer.println(`SUBTOTAL: R$ ${data.subtotal.toFixed(2)}`);
            if (data.servico) {
                printer.println(`SERVIÇO (10%): R$ ${data.servico.toFixed(2)}`);
            }
            printer.bold(true);
            printer.println(`TOTAL: R$ ${data.totalFinal.toFixed(2)}`);
            printer.bold(false);
            printer.newLine();
            printer.alignCenter();
            printer.println("Obrigado pela preferência!");
            printer.println("Volte sempre!");
            printer.cut();
            await printer.execute();
            console.log(`[PRINTER] Conta impressa com sucesso na ${config.name}`);
        }
        catch (error) {
            console.error(`[PRINTER] Erro ao imprimir conta:`, error);
        }
    }
}
exports.printerService = new PrinterService();
