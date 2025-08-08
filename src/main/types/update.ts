export interface UpdateItem {
  version: string;
  hash: string;
  type: string;
  name: string;
}

export interface UpdateType {
  type: string;
  url?: string;
}
