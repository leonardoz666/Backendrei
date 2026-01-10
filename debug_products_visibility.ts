
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Diagnóstico de Produtos ---')

  // 1. Total count
  const totalProducts = await prisma.produto.count()
  console.log(`Total de produtos no DB: ${totalProducts}`)

  // 2. Active count
  const activeProducts = await prisma.produto.count({ where: { ativo: true } })
  console.log(`Total de produtos ATIVOS: ${activeProducts}`)

  // 3. Orphaned count (no category)
  const orphanedProducts = await prisma.produto.count({ where: { categoriaId: null } })
  console.log(`Produtos sem categoria (categoriaId = null): ${orphanedProducts}`)

  // 4. Products pointing to non-existent categories
  const allProducts = await prisma.produto.findMany({ 
    select: { id: true, nome: true, categoriaId: true, ativo: true } 
  })
  const allCategoryIds = (await prisma.categoria.findMany({ select: { id: true } })).map(c => c.id)
  
  const invalidCategoryProducts = allProducts.filter(p => 
    p.categoriaId !== null && !allCategoryIds.includes(p.categoriaId!)
  )
  console.log(`Produtos com categoriaId inválido (aponta para categoria inexistente): ${invalidCategoryProducts.length}`)
  if (invalidCategoryProducts.length > 0) {
    invalidCategoryProducts.forEach(p => console.log(` - [${p.id}] ${p.nome} (CatID: ${p.categoriaId})`))
  }

  // 5. Simulate API Query
  const apiCategories = await prisma.categoria.findMany({
    include: {
      produtos: {
        where: { ativo: true }
      }
    },
    orderBy: { nome: 'asc' }
  })

  let apiProductCount = 0
  const apiProductIds = new Set<number>()
  apiCategories.forEach(c => {
    c.produtos.forEach(p => {
      apiProductCount++
      apiProductIds.add(p.id)
    })
  })
  console.log(`Produtos retornados pela API (via Categorias + Ativo=true): ${apiProductCount}`)

  // 6. Find missing Active products
  const missingActive = allProducts.filter(p => p.ativo && !apiProductIds.has(p.id))
  console.log(`Produtos ATIVOS que NÃO aparecem na API: ${missingActive.length}`)
  if (missingActive.length > 0) {
    console.log('Lista de produtos ativos invisíveis:')
    missingActive.forEach(p => {
        let reason = ''
        if (p.categoriaId === null) reason = 'Sem Categoria'
        else if (!allCategoryIds.includes(p.categoriaId!)) reason = 'Categoria Inexistente'
        else reason = 'Desconhecido (Erro na lógica?)'
        console.log(` - [${p.id}] ${p.nome} (${reason})`)
    })
  }

}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
