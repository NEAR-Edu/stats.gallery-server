const { sql } = require('slonik');

module.exports = () => {
  return sql`
    select account_id, created_at_block_timestamp as block_timestamp
    from account
    where created_at_block_timestamp is not null
    order by created_at_block_timestamp desc
    limit 10
  `;
};
