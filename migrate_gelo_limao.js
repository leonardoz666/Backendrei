
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Migrating permiteGeloLimao for existing drinks...')
  
  // Update all products that are marked as isDrink or have drink-related categories/sectors
  // The logic in frontend was:
  // ['refrigerante', 'sabores'].includes(product.tipoOpcao || '') || product.setor === 'Bebidas' || product.setor === 'Drinks' || product.isDrink
  
  // We can just use isDrink from DB since we fixed sectors previously? 
  // Or better, let's be safe and update based on isDrink = true.
  
  const updated = await prisma.produto.updateMany({
    where: {
      OR: [
        { isDrink: true },
        { tipoOpcao: 'refrigerante' },
        // We can't easily query sector here as it is on Categoria (except if we had a join update, but Prisma updateMany doesn't support joins easily)
        // But we can iterate.
      ]
    },
    data: {
      permiteGeloLimao: true
    }
  })
  
  console.log(`Updated ${updated.count} products to have permiteGeloLimao = true.`)
  
  // Also checking categories manually to be sure
  const products = await prisma.produto.findMany({
    include: { categoria: true },
    where: { permiteGeloLimao: false }
  })
  
  let count = 0
  for (const p of products) {
    let shouldUpdate = false
    if (p.categoria) {
        const catNome = p.categoria.nome.toLowerCase()
        const catSetor = p.categoria.setor
        
        if (catSetor === 'BAR' || catSetor === 'Drinks' || catSetor === 'Bebidas') shouldUpdate = true
        if (catNome.includes('bebida') || catNome.includes('drink') || catNome.includes('refrigerante') || catNome.includes('suco') || catNome.includes('cerveja')) shouldUpdate = true
    }
    
    if (shouldUpdate) {
        await prisma.produto.update({
            where: { id: p.id },
            data: { permiteGeloLimao: true }
        })
        count++
    }
  }
  console.log(`Updated additional ${count} products based on category.`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
