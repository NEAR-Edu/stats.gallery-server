import { sql } from 'slonik';
import { Params } from './Params';

export default (params: Params) => {
  return sql`
    select distinct receiver_account_id
    from receipts
    where predecessor_account_id = ${params.account_id}
  `;
};
