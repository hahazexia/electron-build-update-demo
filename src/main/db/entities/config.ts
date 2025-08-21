import { TableModel, ExtractData } from '../orm.js';

export class ConfigModel extends TableModel<ConfigSchema> {
  table = 'configs';
  schema: ConfigSchema = {
    id: {
      type: 'integer',
      primary: true,
      autoincrement: true,
    },
    key: {
      type: 'text',
      notNull: true,
      unique: true,
    },
    value: {
      type: 'text',
      notNull: true,
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

type ConfigSchema = {
  id: {
    type: 'integer';
    primary: true;
    autoincrement: true;
  };
  key: {
    type: 'text';
    notNull: true;
    unique: true;
  };
  value: {
    type: 'text';
    notNull: true;
  };
  create_at: {
    type: 'text';
    notNull: true;
    default: { raw: string } | string;
  };
  update_at: {
    type: 'text';
    notNull: true;
    default: { raw: string };
  };
};

export type ConfigData = ExtractData<ConfigSchema>;
