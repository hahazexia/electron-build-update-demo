import { TableModel, ExtractData } from '../orm.js';

export class DBVersionModel extends TableModel<DBVersionSchema> {
  static table = 'db_version';
  static schema: DBVersionSchema = {
    version: {
      type: 'text',
      primary: true,
      default: '0.0.0',
    },
    create_at: {
      type: 'text',
      notNull: true,
      default: { raw: "DATETIME('now', 'localtime')" },
    },
    update_at: {
      type: 'text',
      notNull: true,
      default: { raw: "DATETIME('now', 'localtime')" },
    },
  };
}

type DBVersionSchema = {
  version: {
    type: 'text';
    primary: true;
    default: string;
  };
  create_at: {
    type: 'text';
    notNull: true;
    default: { raw: string };
  };
  update_at: {
    type: 'text';
    notNull: true;
    default: { raw: string };
  };
};

export type DBVersionData = ExtractData<DBVersionSchema>;
