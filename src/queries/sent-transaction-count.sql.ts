import { sql } from 'slonik';
import { Params } from './Params';

export default (params: Params) => {
  const conditions = [sql`signer_account_id = ${params.account_id}`];

  if (
    params.after_block_timestamp !== undefined &&
    params.after_block_timestamp > 0
  ) {
    conditions.push(sql`block_timestamp >= ${params.after_block_timestamp}`);
  }

  if (
    params.before_block_timestamp !== undefined &&
    params.before_block_timestamp > 0
  ) {
    conditions.push(sql`block_timestamp <= ${params.before_block_timestamp}`);
  }

  return sql`
    select count(*) as result
    from transactions
    where ${sql.join(conditions, sql` and `)}
  `;
};
