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
      signer_account_id as account_id,
      count(1) as number_of_transactions
    from
      transactions 
    where ${sql.join(conditions, sql` and `)}
    group by
      signer_account_id
    ${params.limit !== undefined ? sql`limit ${params.limit}` : sql`limit 5`}
    ${params.offset !== undefined ? sql`offset ${params.offset}` : sql``}
  `;
}
