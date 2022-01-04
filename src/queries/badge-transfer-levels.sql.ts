import { sql } from 'slonik';
import { TimestampRange } from './Params';

export default (range: TimestampRange, count: number) => {
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
            where action_kind = 'FUNCTION_CALL'
                and args ->> 'method_name' = 'nft_transfer'
                and ${sql.join(conditions, sql` and `)}
            group by args -> 'args_json' ->> 'receiver_id'
            having count(1) >= ${count}) s;
  `;
};
