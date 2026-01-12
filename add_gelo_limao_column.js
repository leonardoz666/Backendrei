
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Adding permiteGeloLimao column...')
  
  try {
    // Check if column exists first (PostgreSQL specific check or just try/catch)
    // Since we are likely using PostgreSQL (based on schema), the previous fix_schema.js used ALTER TABLE.
    // If it's SQLite (dev.db exists), syntax is similar but need to be careful.
    // inspect_db.py showed dev.db, so it might be SQLite in dev.
    // But schema says postgresql.
    // Let's try a generic approach or check env.
    
    // I'll try to add it. If it fails, it might already exist.
    await prisma.$executeRawUnsafe('ALTER TABLE "Produto" ADD COLUMN "permiteGeloLimao" BOOLEAN DEFAULT false;')
    console.log('Column added successfully.')
  } catch (e) {
    if (e.message.includes('duplicate column') || e.message.includes('already exists')) {
      console.log('Column already exists.')
    } else {
      console.error('Error adding column:', e.message)
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
