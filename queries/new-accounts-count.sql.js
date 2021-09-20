const { sql } = require('slonik');

module.exports = () => {
  return sql`
    select count(*) as new_accounts,
      block_date
    from
      (select account_id,
          to_timestamp((created_at_block_timestamp) / 1000000000)::date as block_date
        from account
        where created_at_block_timestamp is not null) s
    group by block_date
    order by block_date desc
    limit 10
  `;
};
