import { sql } from 'slonik';
import { Params } from './Params';

export default (params: Params) => {
  return sql`
    select *
    from access_keys
    where account_id = ${params.account_id}
  `;
};
