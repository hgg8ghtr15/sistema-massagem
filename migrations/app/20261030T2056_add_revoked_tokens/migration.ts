#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/7eb00056255751f3bac93bf47663547e7c0a0d53e45872a6bac5b38ddb082979/contract';
import startContract from '../../snapshots/7eb00056255751f3bac93bf47663547e7c0a0d53e45872a6bac5b38ddb082979/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/874aa4013b967acb847b3ea4fd55e56d99e3a2957bff9d00f9cba73f1488e452/contract';
import endContract from '../../snapshots/874aa4013b967acb847b3ea4fd55e56d99e3a2957bff9d00f9cba73f1488e452/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'TokenRevogado',
        columns: [
          col('expiresAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('jti', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['jti'])],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
