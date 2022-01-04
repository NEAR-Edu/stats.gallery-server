import { sql } from 'slonik';
import { TimestampRange } from './Params';

export default (range: TimestampRange) => {
  const conditions = [];

  if (
    range.after_block_timestamp !== undefined &&
    range.after_block_timestamp > 0
  ) {
    conditions.push(
      sql`on_chain_transaction.block_timestamp >= ${range.after_block_timestamp}`,
    );
  }

  if (
    range.before_block_timestamp !== undefined &&
    range.before_block_timestamp > 0
  ) {
    conditions.push(
      sql`on_chain_transaction.block_timestamp <= ${range.before_block_timestamp}`,
    );
  }

  return sql`
    select count(*)
    from
        (select 1
        from action_receipt_actions
          where action_kind = 'TRANSFER'
            and ${sql.join(conditions, sql` and `)}
          group by receipt_predecessor_account_id) s;
  `;
};
