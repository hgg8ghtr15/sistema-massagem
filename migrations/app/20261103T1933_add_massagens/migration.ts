#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1f08830d912ae5f7ccff05282ec63521f39038aa8b301ce472a77561dfe3eddb/contract';
import startContract from '../../snapshots/1f08830d912ae5f7ccff05282ec63521f39038aa8b301ce472a77561dfe3eddb/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f650dd73850c53be05baf09ced1c23b27d0776e97a7bf74b4e92776d8ff009c5/contract';
import endContract from '../../snapshots/f650dd73850c53be05baf09ced1c23b27d0776e97a7bf74b4e92776d8ff009c5/contract.json' with { type: 'json' };
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
        table: 'Massagem',
        columns: [
          col('ativo', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('descricao', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('duracaoMinutos', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('nome', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('valorCentavos', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'MassagemMaterial',
        columns: [
          col('massagemId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('materialId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('quantidade', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('unidade', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['massagemId', 'materialId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'MassagistaMassagem',
        columns: [
          col('massagemId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('usuarioId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['usuarioId', 'massagemId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Material',
        columns: [
          col('ativo', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('descricao', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('nome', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Massagem',
        index: 'Massagem_ativo_idx',
        columns: ['ativo'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Massagem',
        index: 'Massagem_nome_key',
        columns: ['nome'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'MassagemMaterial',
        index: 'MassagemMaterial_materialId_idx',
        columns: ['materialId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'MassagistaMassagem',
        index: 'MassagistaMassagem_massagemId_idx',
        columns: ['massagemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Material',
        index: 'Material_ativo_idx',
        columns: ['ativo'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Material',
        index: 'Material_nome_key',
        columns: ['nome'],
        extras: { unique: true },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'MassagemMaterial',
        foreignKey: {
          name: 'MassagemMaterial_massagemId_fkey',
          columns: ['massagemId'],
          references: { schema: 'public', table: 'Massagem', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'MassagemMaterial',
        foreignKey: {
          name: 'MassagemMaterial_materialId_fkey',
          columns: ['materialId'],
          references: { schema: 'public', table: 'Material', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'MassagistaMassagem',
        foreignKey: {
          name: 'MassagistaMassagem_usuarioId_fkey',
          columns: ['usuarioId'],
          references: { schema: 'public', table: 'Usuario', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'MassagistaMassagem',
        foreignKey: {
          name: 'MassagistaMassagem_massagemId_fkey',
          columns: ['massagemId'],
          references: { schema: 'public', table: 'Massagem', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
