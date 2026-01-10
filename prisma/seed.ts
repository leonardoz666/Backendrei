import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10)
  const adminHash = await bcrypt.hash('admin', 10)

  // Create Users
  await prisma.usuario.upsert({
    where: { login: 'admin' },
    update: {
      nome: 'Administrador',
      role: 'ADMIN',
      senha: adminHash,
    },
    create: {
      nome: 'Administrador',
      login: 'admin',
      role: 'ADMIN',
      senha: adminHash,
    },
  })

  await prisma.usuario.upsert({
    where: { login: 'dono' },
    update: {},
    create: {
      nome: 'Leonardo Dono',
      login: 'dono',
      role: 'DONO',
      senha: passwordHash,
    },
  })

  await prisma.usuario.upsert({
    where: { login: 'garcom1' },
    update: {},
    create: {
      nome: 'João Garçom',
      login: 'garcom1',
      role: 'GARCOM',
      senha: passwordHash,
    },
  })

  await prisma.usuario.upsert({
    where: { login: 'caixa1' },
    update: {},
    create: {
      nome: 'Ana Caixa',
      login: 'caixa1',
      role: 'CAIXA',
      senha: passwordHash,
    },
  })

  // Create Tables
  for (let i = 1; i <= 10; i++) {
    await prisma.mesa.upsert({
      where: { numero: i },
      update: {},
      create: {
        numero: i,
        status: 'LIVRE',
      },
    })
  }

  // Create Categories and Products removed per user request
  // Categorias e produtos devem ser cadastrados via sistema


  // Create Printers
  const printers = [
    { setor: 'COZINHA', name: 'Impressora Cozinha', ip: '192.168.1.200' },
    { setor: 'BAR', name: 'Impressora Bar', ip: '192.168.1.201' },
    { setor: 'CAIXA', name: 'Impressora Caixa', ip: '192.168.1.202' }
  ]

  for (const p of printers) {
    await prisma.printerConfig.upsert({
      where: { setor: p.setor },
      update: {},
      create: p
    })
  }

  console.log('Seed data created.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
