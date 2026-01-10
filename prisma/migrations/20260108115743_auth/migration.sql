/*
  Warnings:

  - Added the required column `login` to the `Usuario` table without a default value. This is not possible if the table is not empty.
  - Made the column `senha` on table `Usuario` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "senha" TEXT NOT NULL
);
INSERT INTO "new_Usuario" ("id", "nome", "role", "senha") SELECT "id", "nome", "role", "senha" FROM "Usuario";
DROP TABLE "Usuario";
ALTER TABLE "new_Usuario" RENAME TO "Usuario";
CREATE UNIQUE INDEX "Usuario_login_key" ON "Usuario"("login");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
