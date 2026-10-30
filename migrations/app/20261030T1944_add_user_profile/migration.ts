#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/7eb00056255751f3bac93bf47663547e7c0a0d53e45872a6bac5b38ddb082979/contract';
import endContract from '../../snapshots/7eb00056255751f3bac93bf47663547e7c0a0d53e45872a6bac5b38ddb082979/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f04a8ee016dcf9d244777c5241ed39ee3c6267ef5c0b399a36e66074c7d97fdb/contract';
import startContract from '../../snapshots/f04a8ee016dcf9d244777c5241ed39ee3c6267ef5c0b399a36e66074c7d97fdb/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Usuario',
        column: col('perfil', 'text', {
          notNull: true,
          default: lit('CLIENTE'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
