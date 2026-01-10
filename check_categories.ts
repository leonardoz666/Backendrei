
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const categories = await prisma.categoria.findMany()
  console.log(`Found ${categories.length} categories:`)
  categories.forEach(c => console.log(`- ${c.nome} (ID: ${c.id})`))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
