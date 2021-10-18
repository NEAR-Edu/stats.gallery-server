const { sql } = require('slonik');

module.exports = params => {
  return sql`
    select r.receipt_included_in_block_timestamp as result
    from accounts a
    join action_receipt_actions r
      on a.created_by_receipt_id = r.receipt_id
    where a.account_id = ${params.account_id}
      and a.created_by_receipt_id is not null
    limit 1
  `;
};
