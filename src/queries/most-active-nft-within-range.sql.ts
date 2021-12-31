import { sql } from 'slonik';
import { TimestampRange } from './Params';

export default (range: TimestampRange, limit: number) => {
  const conditions = [];

  if (
    range.after_block_timestamp !== undefined &&
    range.after_block_timestamp > 0
  ) {
    conditions.push(
      sql`action_receipt_action.receipt_included_in_block_timestamp >= ${range.after_block_timestamp}`,
    );
  }

  if (
    range.before_block_timestamp !== undefined &&
    range.before_block_timestamp > 0
  ) {
    conditions.push(
      sql`action_receipt_action.receipt_included_in_block_timestamp <= ${range.before_block_timestamp}`,
    );
  }

  // Currently, we limit this to only the top few, but once new requirements
  // come in, this should be revisited. Another reason why we hardcode this
  // is to help dissuade curious people from overworking the indexer.
  return sql`
    select
      receipt_receiver_account_id as account_id,
      count(1) as number_of_transactions
    from
      action_receipt_action 
    where ${sql.join(conditions, sql` and `)}
      and action_kind = 'FUNCTION_CALL'
      and args ->> 'method_name' like 'nft_%'
    group by
      receipt_receiver_account_id
    order by number_of_transactions desc
    limit ${limit}
  `;
};
