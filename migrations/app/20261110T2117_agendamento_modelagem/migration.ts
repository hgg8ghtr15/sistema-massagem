#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/7d5fc37f7cba615f60b9a32c39a3e23a48251055c28923efe5a3caf027230650/contract';
import endContract from '../../snapshots/7d5fc37f7cba615f60b9a32c39a3e23a48251055c28923efe5a3caf027230650/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ca0a5e44afd8a4100bb52775268785feb9d530a07195d6198c26c9fd3c87b44d/contract';
import startContract from '../../snapshots/ca0a5e44afd8a4100bb52775268785feb9d530a07195d6198c26c9fd3c87b44d/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  createExtension,
  fn,
  lit,
  primaryKey,
  rawSql,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'AgendamentoHistorico',
        columns: [
          col('acao', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('agendamentoId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('autorId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('valoresAnteriores', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('valoresNovos', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'BloqueioMassagista',
        columns: [
          col('dataHoraFim', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1', typeParams: { precision: 3 } },
          }),
          col('dataHoraInicio', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('motivo', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('usuarioId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'HorarioTrabalho',
        columns: [
          col('diaSemana', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('fim', 'character varying(5)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 5 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('inicio', 'character varying(5)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 5 } },
          }),
          col('usuarioId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'SolicitacaoReagendamento',
        columns: [
          col('agendamentoId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('dataHoraSugerida', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('motivo', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('respondidoEm', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-string@1', typeParams: { precision: 3 } },
          }),
          col('respondidoPorId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDENTE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Agendamento',
        column: col('confirmadoEm', 'timestamptz(3)', {
          codecRef: { codecId: 'pg/timestamptz-string@1', typeParams: { precision: 3 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Agendamento',
        column: col('confirmadoPorId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Agendamento',
        column: col('dataHoraFim', 'timestamptz(3)', {
          codecRef: { codecId: 'pg/timestamptz-string@1', typeParams: { precision: 3 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Agendamento',
        column: col('massagemId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Agendamento',
        column: col('massagistaId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'Agendamento',
        column: 'dataHora',
        type: 'timestamptz(3)',
        using: sql`"dataHora" AT TIME ZONE 'America/Cuiaba'`,
      }),
      this.setDefault({
        schema: 'public',
        table: 'Agendamento',
        column: col('status', 'text', {
          default: lit('PENDENTE'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'Agendamento',
        index: 'Agendamento_massagistaId_dataHora_idx',
        columns: ['massagistaId', 'dataHora'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Agendamento',
        index: 'Agendamento_status_dataHora_idx',
        columns: ['status', 'dataHora'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Agendamento',
        index: 'Agendamento_usuarioId_dataHora_idx',
        columns: ['usuarioId', 'dataHora'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AgendamentoHistorico',
        index: 'AgendamentoHistorico_agendamentoId_createdAt_idx',
        columns: ['agendamentoId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BloqueioMassagista',
        index: 'BloqueioMassagista_usuarioId_dataHoraInicio_dataHoraFim_idx',
        columns: ['usuarioId', 'dataHoraInicio', 'dataHoraFim'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'HorarioTrabalho',
        index: 'HorarioTrabalho_usuarioId_diaSemana_idx',
        columns: ['usuarioId', 'diaSemana'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SolicitacaoReagendamento',
        index: 'SolicitacaoReagendamento_agendamentoId_idx',
        columns: ['agendamentoId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SolicitacaoReagendamento',
        index: 'SolicitacaoReagendamento_status_createdAt_idx',
        columns: ['status', 'createdAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Agendamento',
        foreignKey: {
          name: 'Agendamento_confirmadoPorId_fkey',
          columns: ['confirmadoPorId'],
          references: { schema: 'public', table: 'Usuario', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Agendamento',
        foreignKey: {
          name: 'Agendamento_massagemId_fkey',
          columns: ['massagemId'],
          references: { schema: 'public', table: 'Massagem', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Agendamento',
        foreignKey: {
          name: 'Agendamento_massagistaId_fkey',
          columns: ['massagistaId'],
          references: { schema: 'public', table: 'Usuario', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AgendamentoHistorico',
        foreignKey: {
          name: 'AgendamentoHistorico_agendamentoId_fkey',
          columns: ['agendamentoId'],
          references: { schema: 'public', table: 'Agendamento', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AgendamentoHistorico',
        foreignKey: {
          name: 'AgendamentoHistorico_autorId_fkey',
          columns: ['autorId'],
          references: { schema: 'public', table: 'Usuario', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BloqueioMassagista',
        foreignKey: {
          name: 'BloqueioMassagista_usuarioId_fkey',
          columns: ['usuarioId'],
          references: { schema: 'public', table: 'Usuario', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'HorarioTrabalho',
        foreignKey: {
          name: 'HorarioTrabalho_usuarioId_fkey',
          columns: ['usuarioId'],
          references: { schema: 'public', table: 'Usuario', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SolicitacaoReagendamento',
        foreignKey: {
          name: 'SolicitacaoReagendamento_agendamentoId_fkey',
          columns: ['agendamentoId'],
          references: { schema: 'public', table: 'Agendamento', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SolicitacaoReagendamento',
        foreignKey: {
          name: 'SolicitacaoReagendamento_respondidoPorId_fkey',
          columns: ['respondidoPorId'],
          references: { schema: 'public', table: 'Usuario', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      createExtension('btree_gist'),
      rawSql({
        id: 'constraint.public.Agendamento.active_time_no_overlap',
        label: 'Prevent overlapping active appointments',
        operationClass: 'additive',
        target: {
          id: 'postgres',
          details: {
            schema: 'public',
            objectType: 'table',
            name: 'Agendamento',
          },
        },
        precheck: [
          {
            description: 'ensure active appointment exclusion constraint is missing',
            sql: 'SELECT NOT EXISTS (SELECT 1 FROM "pg_constraint" WHERE "conname" = $1 AND "conrelid" = \'"public"."Agendamento"\'::regclass) AS "result"',
            params: ['Agendamento_active_time_no_overlap'],
            expectation: {
              expects: 'absent',
              object: 'constraint Agendamento_active_time_no_overlap',
            },
          },
        ],
        execute: [
          {
            description: 'normalize existing appointment statuses',
            sql: `UPDATE "public"."Agendamento"
              SET "status" = CASE lower("status")
                WHEN 'pendente' THEN 'PENDENTE'
                WHEN 'confirmado' THEN 'CONFIRMADO'
                WHEN 'reagendamento solicitado' THEN 'REAGENDAMENTO_SOLICITADO'
                WHEN 'reagendado' THEN 'REAGENDADO'
                WHEN 'concluído' THEN 'CONCLUIDO'
                WHEN 'concluido' THEN 'CONCLUIDO'
                WHEN 'cancelado' THEN 'CANCELADO'
                WHEN 'não compareceu' THEN 'NAO_COMPARECEU'
                WHEN 'nao_compareceu' THEN 'NAO_COMPARECEU'
                ELSE "status"
              END`,
          },
          {
            description: 'add exclusion constraint for overlapping active appointments',
            sql: `ALTER TABLE "public"."Agendamento"
              ADD CONSTRAINT "Agendamento_active_time_no_overlap"
              EXCLUDE USING gist (
                "massagistaId" WITH =,
                tstzrange("dataHora", "dataHoraFim", '[)') WITH &&
              )
              WHERE (
                "massagistaId" IS NOT NULL
                AND "dataHoraFim" IS NOT NULL
                AND "status" IN (
                  'PENDENTE',
                  'CONFIRMADO',
                  'REAGENDAMENTO_SOLICITADO',
                  'REAGENDADO'
                )
              )`,
          },
        ],
        postcheck: [
          {
            description: 'verify active appointment exclusion constraint exists',
            sql: 'SELECT EXISTS (SELECT 1 FROM "pg_constraint" WHERE "conname" = $1 AND "conrelid" = \'"public"."Agendamento"\'::regclass) AS "result"',
            params: ['Agendamento_active_time_no_overlap'],
            expectation: {
              expects: 'present',
              object: 'constraint Agendamento_active_time_no_overlap',
            },
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
