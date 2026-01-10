
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Starting manual migration...')
  
  const columns = [
    { name: 'foto', type: 'TEXT', sql: 'ALTER TABLE Produto ADD COLUMN foto TEXT;' },
    { name: 'tipoOpcao', type: 'TEXT', sql: "ALTER TABLE Produto ADD COLUMN tipoOpcao TEXT DEFAULT 'padrao';" },
    { name: 'sabores', type: 'TEXT', sql: 'ALTER TABLE Produto ADD COLUMN sabores TEXT;' },
    { name: 'isDrink', type: 'BOOLEAN', sql: 'ALTER TABLE Produto ADD COLUMN isDrink BOOLEAN DEFAULT 0;' },
    { name: 'favorito', type: 'BOOLEAN', sql: 'ALTER TABLE Produto ADD COLUMN favorito BOOLEAN DEFAULT 0;' },
    { name: 'ultimoUso', type: 'DATETIME', sql: 'ALTER TABLE Produto ADD COLUMN ultimoUso DATETIME;' }
  ]

  for (const col of columns) {
    try {
      await prisma.$executeRawUnsafe(col.sql)
      console.log(`Added column: ${col.name}`)
    } catch (e) {
      if (e.message.includes('duplicate column name')) {
        console.log(`Column ${col.name} already exists.`)
      } else {
        console.error(`Error adding column ${col.name}:`, e.message)
      }
    }
  }
  
  console.log('Migration finished.')
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
