import 'dotenv/config'
import path from 'node:path'
import { definePrismaConfig } from 'prisma/config'
import { defineConfig as ormConfig, prisma7Schema } from '@prisma/orm-postgres/config'

export default definePrismaConfig({
  orm: ormConfig({
    contract: prisma7Schema(path.join('prisma', 'schema.prisma')),
    db: {
      connection: process.env.DATABASE_URL!,
    },
  }),
})
