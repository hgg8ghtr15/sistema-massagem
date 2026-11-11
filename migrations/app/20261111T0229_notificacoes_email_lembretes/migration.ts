#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/7ee415701b4e5f170e8efa0dec0aaef0d944f947a8437ce89723071f50b35994/contract';
import startContract from '../../snapshots/7ee415701b4e5f170e8efa0dec0aaef0d944f947a8437ce89723071f50b35994/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/9cc748ae20be64f91f86a91cc29f509f206f76a3c73b9703c59f2db90e1c2f07/contract';
import endContract from '../../snapshots/9cc748ae20be64f91f86a91cc29f509f206f76a3c73b9703c59f2db90e1c2f07/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Notificacao',
        columns: [
          col('agendamentoId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('chaveUnica', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('emailEnviadoEm', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-string@1', typeParams: { precision: 3 } },
          }),
          col('emailErro', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('emailProcessandoEm', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-string@1', typeParams: { precision: 3 } },
          }),
          col('emailProximaTentativaEm', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1', typeParams: { precision: 3 } },
          }),
          col('emailStatus', 'text', {
            notNull: true,
            default: lit('PENDENTE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('emailTentativas', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('historicoId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('lidaEm', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-string@1', typeParams: { precision: 3 } },
          }),
          col('mensagem', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tipo', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('titulo', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('usuarioId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Agendamento',
        column: col('lembrete24hEnviadoEm', 'timestamptz(3)', {
          codecRef: { codecId: 'pg/timestamptz-string@1', typeParams: { precision: 3 } },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notificacao',
        index: 'Notificacao_chaveUnica_key',
        columns: ['chaveUnica'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notificacao',
        index: 'Notificacao_emailStatus_emailProximaTentativaEm_idx',
        columns: ['emailStatus', 'emailProximaTentativaEm'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notificacao',
        index: 'Notificacao_usuarioId_lidaEm_createdAt_idx',
        columns: ['usuarioId', 'lidaEm', 'createdAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Notificacao',
        foreignKey: {
          name: 'Notificacao_usuarioId_fkey',
          columns: ['usuarioId'],
          references: { schema: 'public', table: 'Usuario', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Notificacao',
        foreignKey: {
          name: 'Notificacao_agendamentoId_fkey',
          columns: ['agendamentoId'],
          references: { schema: 'public', table: 'Agendamento', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Notificacao',
        foreignKey: {
          name: 'Notificacao_historicoId_fkey',
          columns: ['historicoId'],
          references: { schema: 'public', table: 'AgendamentoHistorico', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
