#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/797c601d95830c46b8dbab257e96b484fa6fd7ff81df2122677518bbd3343a17/contract';
import endContract from '../../snapshots/797c601d95830c46b8dbab257e96b484fa6fd7ff81df2122677518bbd3343a17/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f650dd73850c53be05baf09ced1c23b27d0776e97a7bf74b4e92776d8ff009c5/contract';
import startContract from '../../snapshots/f650dd73850c53be05baf09ced1c23b27d0776e97a7bf74b4e92776d8ff009c5/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Massagem',
        column: col('youtubeUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
