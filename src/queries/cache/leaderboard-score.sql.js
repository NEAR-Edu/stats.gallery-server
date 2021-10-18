const { sql } = require('slonik');

module.exports = params => {
  return sql`
    select account_id, balance::text, score
    from account
    where balance is not null and score is not null
      and account_id not like '%.lockup.near'
      and account_id not like '%.poolv1.near'
      and account_id not like 'nfeco__.near'
      and account_id not like 'nfendowment__.near'
    order by account.score desc
    limit 20
  `;
};
