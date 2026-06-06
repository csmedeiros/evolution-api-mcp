export type ParamLocation = 'path' | 'query' | 'body';

export type ParamType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface Param {
  name: string;
  in: ParamLocation;
  type: ParamType;
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
