import sqlite from 'better-sqlite3';

type FieldType = 'integer' | 'text' | 'real' | 'boolean' | 'blob' | string;

interface FieldOptions {
  type: FieldType;
  primary?: boolean;
  autoincrement?: boolean;
  notNull?: boolean;
  unique?: boolean;
  default?: any;
}

type Schema = Record<string, FieldOptions>;

interface UpsertOptions {
  conflictPaths: string[];
  skipUpdateIfNoValuesChanged: boolean;
}

export type ExtractData<T extends Schema> = {
  [K in keyof T as T[K]['autoincrement'] extends true
    ? never
    : K]: T[K]['type'] extends 'integer'
    ? number
    : T[K]['type'] extends 'text'
    ? string
    : T[K]['type'] extends 'real'
    ? number
    : T[K]['type'] extends 'boolean'
    ? boolean
    : any;
};
export type DataWithId<T> = T & { id: number };

export type ModelInstance<T extends Schema> = {
  readonly db: sqlite.Database;
  table: string;
  schema: Schema;
  createTable(): void;
  insert(data: ExtractData<T>): DataWithId<ExtractData<T>>;
  upsert(
    data: ExtractData<T>,
    options: UpsertOptions
  ): DataWithId<ExtractData<T>>;
  update(id: number, data: Partial<ExtractData<T>>): boolean;
  findOneBy(data: Partial<ExtractData<T>>): DataWithId<ExtractData<T>> | null;
  findAll(): DataWithId<ExtractData<T>>[];
  deleteOneBy(data: Partial<ExtractData<T>>): boolean;
  deleteAll(): number;
  findExistingByConflictPaths(
    data: ExtractData<T>,
    conflictPaths: string[]
  ): DataWithId<ExtractData<T>> | null;
};

export abstract class TableModel<T extends Schema> implements ModelInstance<T> {
  abstract table: string;
  abstract schema: Schema;
  public db: sqlite.Database;

  constructor(db: sqlite.Database) {
    this.db = db;
  }

  createTable(): void {
    const schema = this.schema;
    const table = this.table;
    if (!schema || !table)
      throw new Error('createTable Schema or table name not defined');

    const fields: string[] = [];
    for (const [fieldName, options] of Object.entries(schema)) {
      const parts: string[] = [
        fieldName,
        options.type === 'boolean' ? 'INTEGER' : options.type.toUpperCase(),
      ];

      if (options.primary) parts.push('PRIMARY KEY');
      if (options.autoincrement) parts.push('AUTOINCREMENT');
      if (options.notNull) parts.push('NOT NULL');
      if (options.unique) parts.push('UNIQUE');

      if (options.default !== undefined) {
        let defaultValue;
        if (typeof options.default === 'object' && 'raw' in options.default) {
          defaultValue = `(${options.default.raw})`;
        } else {
          defaultValue =
            typeof options.default === 'string'
              ? `'${options.default}'`
              : options.default;
        }
        parts.push(`DEFAULT ${defaultValue}`);
      }

      fields.push(parts.join(' '));
    }

    const sql = `CREATE TABLE IF NOT EXISTS ${table} (
      ${fields.join(',\n  ')}
    )`;
    this.db.prepare(sql).run();
  }

  insert(data: ExtractData<T>): DataWithId<ExtractData<T>> {
    const fields = Object.keys(data) as (keyof ExtractData<T>)[];
    const placeholders = fields.map(field => `@${String(field)}`);

    const sql = `INSERT INTO ${this.table} (${fields.join(',')})
                 VALUES (${placeholders.join(',')})`;
    const result = this.db.prepare(sql).run(data);

    return { ...data, id: result.lastInsertRowid as number };
  }

  upsert(
    data: ExtractData<T>,
    options: UpsertOptions
  ): DataWithId<ExtractData<T>> {
    options.conflictPaths.forEach(path => {
      if (!Object.keys(this.schema).includes(path)) {
        throw new Error(
          `upsert Conflict path "${path}" does not exist in schema`
        );
      }
    });

    const insertFields = Object.keys(data) as (keyof ExtractData<T>)[];
    const insertPlaceholders = insertFields.map(field => `@${String(field)}`);

    const conflictClause = `ON CONFLICT(${options.conflictPaths.join(',')})`;

    const updateFields = insertFields.filter(
      field => !options.conflictPaths.includes(String(field))
    );

    if (options.skipUpdateIfNoValuesChanged && updateFields.length === 0) {
      const existing = this.findExistingByConflictPaths(
        data,
        options.conflictPaths
      );
      return existing ? existing : this.insert(data);
    }

    const updateAssignments = [
      ...updateFields.map(
        field => `${String(field)} = EXCLUDED.${String(field)}`
      ),
      "update_at = DATETIME('now', 'localtime')",
    ];

    const sql = `
      INSERT INTO ${this.table} (${insertFields.join(',')})
      VALUES (${insertPlaceholders.join(',')})
      ${conflictClause} DO UPDATE SET
        ${updateAssignments.join(',')}
      RETURNING *
    `;

    const result = this.db.prepare(sql).get(data) as DataWithId<ExtractData<T>>;
    return result;
  }

  findExistingByConflictPaths(
    data: ExtractData<T>,
    conflictPaths: string[]
  ): DataWithId<ExtractData<T>> | null {
    const whereClauses = conflictPaths.map(path => `${path} = @${path}`);
    const sql = `
      SELECT * FROM ${this.table}
      WHERE ${whereClauses.join(' AND ')}
    `;

    const queryData = conflictPaths.reduce((obj, path) => {
      obj[path] = (data as Record<string, any>)[path];
      return obj;
    }, {} as Record<string, any>);

    return this.db.prepare(sql).get(queryData) as DataWithId<
      ExtractData<T>
    > | null;
  }

  update(id: number, data: Partial<ExtractData<T>>): boolean {
    const updateData = {
      ...data,
      update_at: { raw: "DATETIME('now', 'localtime')" },
    };

    if (Object.keys(updateData).length === 0) return false;

    const updates = Object.entries(updateData).map(([key, value]) => {
      if (typeof value === 'object' && 'raw' in value) {
        return `${key} = ${value.raw}`;
      }
      return `${key} = @${key}`;
    });

    const sql = `UPDATE ${this.table} SET ${updates.join(',')} WHERE id = @id`;

    const params = Object.entries(updateData).reduce(
      (obj, [key, value]) => {
        if (!(typeof value === 'object' && 'raw' in value)) {
          obj[key] = value;
        }
        return obj;
      },
      { id } as Record<string, any>
    );

    return this.db.prepare(sql).run(params).changes > 0;
  }

  findOneBy(data: Partial<ExtractData<T>>): DataWithId<ExtractData<T>> | null {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      throw new Error('findOneBy query conditions cannot be null');
    }

    entries.forEach(([key]) => {
      if (!Object.keys(this.schema).includes(key)) {
        throw new Error(
          `findOneBy ${key} doesn't exists in table ${this.table}`
        );
      }
    });

    const whereClauses = entries.map(([key]) => `${key} = @${key}`);
    const whereSql = whereClauses.join(' AND ');

    const sql = `
      SELECT * FROM ${this.table}
      WHERE ${whereSql}
      LIMIT 1
    `;

    const result = this.db.prepare(sql).get(data) as
      | DataWithId<ExtractData<T>>
      | undefined;
    return result || null;
  }

  findAll(): DataWithId<ExtractData<T>>[] {
    const sql = `SELECT * FROM ${this.table}`;
    return this.db.prepare(sql).all() as DataWithId<ExtractData<T>>[];
  }

  deleteOneBy(data: Partial<ExtractData<T>>): boolean {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      throw new Error('deleteOneBy query conditions cannot be null');
    }

    entries.forEach(([key]) => {
      if (!Object.keys(this.schema).includes(key)) {
        throw new Error(
          `deleteOneBy ${key} doesn't exists in table ${this.table}`
        );
      }
    });

    const whereClauses = entries.map(([key]) => `${key} = @${key}`);
    const whereSql = whereClauses.join(' AND ');

    const sql = `
      DELETE FROM ${this.table}
      WHERE ${whereSql}
      LIMIT 1
    `;

    return this.db.prepare(sql).run(data).changes > 0;
  }

  deleteAll(): number {
    const sql = `DELETE FROM ${this.table}`;

    const result = this.db.prepare(sql).run();
    return result.changes;
  }
}
