import { sql } from 'slonik';
import { Params } from './Params';

export default (params: Params) => {
  return sql`
    select count(*) as result
    where exists(
      select *
      from action_receipt_actions
      where action_kind = 'DEPLOY_CONTRACT'
        and receipt_predecessor_account_id = ${params.account_id}
    )
  `;
};
