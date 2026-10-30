#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1f08830d912ae5f7ccff05282ec63521f39038aa8b301ce472a77561dfe3eddb/contract';
import endContract from '../../snapshots/1f08830d912ae5f7ccff05282ec63521f39038aa8b301ce472a77561dfe3eddb/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/874aa4013b967acb847b3ea4fd55e56d99e3a2957bff9d00f9cba73f1488e452/contract';
import startContract from '../../snapshots/874aa4013b967acb847b3ea4fd55e56d99e3a2957bff9d00f9cba73f1488e452/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createIndex({
        schema: 'public',
        table: 'TokenRevogado',
        index: 'TokenRevogado_expiresAt_idx',
        columns: ['expiresAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
