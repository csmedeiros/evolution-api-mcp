export type ParamLocation = 'path' | 'query' | 'body';

export interface Param {
  name: string;
  in: ParamLocation;
  type: string;
  required: boolean;
  desc: string;
}

export interface Action {
  id: string;
  domain: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  readOnly: boolean;
  summary: string;
  params: Param[];
}
