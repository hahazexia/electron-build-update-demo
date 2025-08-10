import { TableModel, ExtractData } from '../orm.js';

export class ConfigModel extends TableModel<ConfigSchema> {
  static table = 'configs';
  static schema: ConfigSchema = {
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
};

export type ConfigData = ExtractData<ConfigSchema>;
