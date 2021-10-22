import { sql } from 'slonik';
import { Params } from './Params';

export default (params: Params) => {

  const conditions = [];

  if (
    params.after_block_timestamp !== undefined &&
    params.after_block_timestamp > 0
  ) {
    conditions.push(
      sql`transactions.block_timestamp >= ${params.after_block_timestamp}`,
    );
  }

  if (
    params.before_block_timestamp !== undefined &&
    params.before_block_timestamp > 0
  ) {
    conditions.push(
      sql`transactions.block_timestamp <= ${params.before_block_timestamp}`,
    );
  }

  return sql`
    select
      action_receipt_actions.receipt_predecessor_account_id as account_id
    from
      action_receipt_actions 
    inner join 
      accounts on accounts.account_id = action_receipt_actions.receipt_predecessor_account_id
    group by
      action_receipt_actions.receipt_predecessor_account_id
    where ${sql.join(conditions, sql` and `)}
    ${params.limit !== undefined ? sql`limit ${params.limit}` : sql`limit 5`}
    ${params.offset !== undefined ? sql`offset ${params.offset}` : sql``}
  `;
}
