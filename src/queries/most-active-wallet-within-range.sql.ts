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

  // Currently, we limit this to only the top few, but once new requirements
  // come in, this should be revisited. Another reason why we hardcode this
  // is to help dissuade curious people from overworking the indexer.
  return sql`
    select
      signer_account_id as account_id,
      count(1) as number_of_transactions
    from
      on_chain_transaction 
    where ${sql.join(conditions, sql` and `)}
    group by
      signer_account_id
    order by number_of_transactions desc
    limit 15
  `;
};
