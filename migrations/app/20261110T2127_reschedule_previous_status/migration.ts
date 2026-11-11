#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/7d5fc37f7cba615f60b9a32c39a3e23a48251055c28923efe5a3caf027230650/contract';
import startContract from '../../snapshots/7d5fc37f7cba615f60b9a32c39a3e23a48251055c28923efe5a3caf027230650/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/7ee415701b4e5f170e8efa0dec0aaef0d944f947a8437ce89723071f50b35994/contract';
import endContract from '../../snapshots/7ee415701b4e5f170e8efa0dec0aaef0d944f947a8437ce89723071f50b35994/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumnWithTemporaryDefault({
        schema: 'public',
        table: 'SolicitacaoReagendamento',
        column: 'statusAnterior',
        type: 'text',
        temporaryDefault: sql`''`,
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
