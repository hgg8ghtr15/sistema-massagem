import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';
import type { Contract } from '../../prisma/contract';
import * as fs from 'fs';
import * as path from 'path';

const contractJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../prisma/contract.json'), 'utf-8')
);

export const contract = contractFromJson<Contract>(contractJson);

export const db = postgres({
  contract,
  url: process.env['DATABASE_URL']!,
});