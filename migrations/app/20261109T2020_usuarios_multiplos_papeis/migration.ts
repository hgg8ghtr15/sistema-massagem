#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/797c601d95830c46b8dbab257e96b484fa6fd7ff81df2122677518bbd3343a17/contract';
import startContract from '../../snapshots/797c601d95830c46b8dbab257e96b484fa6fd7ff81df2122677518bbd3343a17/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/ca0a5e44afd8a4100bb52775268785feb9d530a07195d6198c26c9fd3c87b44d/contract';
import endContract from '../../snapshots/ca0a5e44afd8a4100bb52775268785feb9d530a07195d6198c26c9fd3c87b44d/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      ...this.renameColumn({ schema: 'public', table: 'Usuario', column: 'perfil', to: 'perfis' }),
      this.dropDefault({ schema: 'public', table: 'Usuario', column: 'perfis' }),
      this.alterColumnType({
        schema: 'public',
        table: 'Usuario',
        column: 'perfis',
        type: 'text[]',
        using: sql`ARRAY["perfis"]::text[]`,
      }),
      this.dropNotNull({ schema: 'public', table: 'Usuario', column: 'perfis' }),
      this.setDefault({
        schema: 'public',
        table: 'Usuario',
        column: col('perfis', 'text[]', {
          default: lit(['CLIENTE']),
          codecRef: { codecId: 'pg/text@1', many: true },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
