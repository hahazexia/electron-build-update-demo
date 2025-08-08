export interface UpsertConfig {
  key: string;
  value: string;
}

export interface UpsertConfigRes {
  msg: string;
  status: boolean;
}

export interface GetConfigRes {
  status: boolean;
  data: UpsertConfig | null;
  msg: string;
}

export interface DeleteConfigRes {
  msg: string;
  status: boolean;
}

export interface DeleteAllConfigRes {
  msg: string;
  status: boolean;
}
