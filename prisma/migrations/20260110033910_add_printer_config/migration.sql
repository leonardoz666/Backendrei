-- CreateTable
CREATE TABLE "PrinterConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "setor" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 9100,
    "enabled" BOOLEAN NOT NULL DEFAULT true
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Comanda" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mesaId" INTEGER NOT NULL,
    "usuarioId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "total" REAL NOT NULL DEFAULT 0.0,
    "abertaEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechadaEm" DATETIME,
    CONSTRAINT "Comanda_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Comanda_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Comanda" ("abertaEm", "fechadaEm", "id", "mesaId", "status", "total") SELECT "abertaEm", "fechadaEm", "id", "mesaId", "status", "total" FROM "Comanda";
DROP TABLE "Comanda";
ALTER TABLE "new_Comanda" RENAME TO "Comanda";
CREATE TABLE "new_Produto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "categoriaId" INTEGER,
    "preco" REAL NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "foto" TEXT,
    "tipoOpcao" TEXT NOT NULL DEFAULT 'padrao',
    "sabores" TEXT,
    "isDrink" BOOLEAN NOT NULL DEFAULT false,
    "favorito" BOOLEAN NOT NULL DEFAULT false,
    "ultimoUso" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Produto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Produto" ("ativo", "categoriaId", "id", "nome", "preco") SELECT "ativo", "categoriaId", "id", "nome", "preco" FROM "Produto";
DROP TABLE "Produto";
ALTER TABLE "new_Produto" RENAME TO "Produto";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PrinterConfig_setor_key" ON "PrinterConfig"("setor");
