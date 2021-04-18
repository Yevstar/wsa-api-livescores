import { ParamOptions, QueryParam } from 'routing-controllers';

export const RequiredQueryParam = (name: string, options?: ParamOptions) =>
  QueryParam(name, { ...options, required: true });
