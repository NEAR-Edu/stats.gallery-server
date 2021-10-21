import { sql } from 'slonik';
import { Params } from './Params';

export default (params: Params) => {
  return sql`
    select
      case
        when exists (
          select *
          from receipts
          join action_receipt_actions ara on receipts.receipt_id = ara.receipt_id
          where predecessor_account_id = ${params.account_id}
            and (receiver_account_id like '%.poolv1.near' or receiver_account_id = 'meta-pool.near')
            and args->>'method_name' = 'deposit_and_stake'
        ) then 1
        else 0
      end as result
  `;
};
