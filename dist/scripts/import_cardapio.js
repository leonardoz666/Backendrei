"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();
async function main() {
    // Path to cardapio.json relative to this script
    // This script is in BACKEND/src/scripts
    // cardapio.json is in rei-do-pirao (root of project, which is BACKEND/..)
    // Wait, check directory structure again.
    // c:\Users\Leonardo\Documents\Rei\rei-do-pirao\cardapio.json
    // c:\Users\Leonardo\Documents\Rei\rei-do-pirao\BACKEND\src\scripts\import_cardapio.ts
    const cardapioPath = path_1.default.resolve(__dirname, '../../../cardapio.json');
    console.log(`Reading from: ${cardapioPath}`);
    if (!fs_1.default.existsSync(cardapioPath)) {
        console.error('cardapio.json not found!');
        process.exit(1);
    }
    const rawData = fs_1.default.readFileSync(cardapioPath, 'utf-8');
    const data = JSON.parse(rawData);
    const items = data.items;
    if (!items || !Array.isArray(items)) {
        console.error('Invalid JSON format: "items" array missing.');
        process.exit(1);
    }
    console.log(`Found ${items.length} items to import.`);
    for (const item of items) {
        try {
            const sabores = Array.isArray(item.sabores) ? JSON.stringify(item.sabores) : (item.sabores || null);
            // Try to find by name to update or create
            const existing = await prisma.produto.findFirst({
                where: { nome: item.nome }
            });
            const productData = {
                nome: item.nome,
                preco: Number(item.preco) || 0,
                tipoOpcao: item.tipoOpcao || 'padrao',
                sabores: sabores,
                isDrink: !!item.isDrink,
                favorito: !!item.favorito,
                ativo: true,
                // Optional: preserve ultimoUso if needed, but maybe not critical
                // ultimoUso: item.ultimoUso ? new Date(item.ultimoUso) : new Date() 
            };
            if (existing) {
                console.log(`Updating product: ${item.nome}`);
                await prisma.produto.update({
                    where: { id: existing.id },
                    data: productData
                });
            }
            else {
                console.log(`Creating product: ${item.nome}`);
                await prisma.produto.create({
                    data: productData
                });
            }
        }
        catch (error) {
            console.error(`Error processing item ${item.nome}:`, error);
        }
    }
    console.log('Import finished.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
