import { sql } from 'slonik';
import { Params } from './Params';

export default (params: Params) => {
  return sql`
    select count(*) as result
    where exists(
      select *
      from action_receipt_actions
      where action_kind = 'FUNCTION_CALL'
        and receipt_receiver_account_id = ${params.account_id}
        and args ->> 'method_name' = 'nft_transfer'
    )
  `;
};
