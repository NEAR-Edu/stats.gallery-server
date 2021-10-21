import { sql } from 'slonik';
import { Params } from './Params';

export default (params: Params) => {
  return sql`
    select score as result
    from account
    where account_id = ${params.account_id}
  `;
};
