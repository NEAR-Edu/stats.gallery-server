const { sql } = require('slonik');

module.exports = params => {
  return sql`
    select score as result
    from account
    where account_id = ${params.account_id}
  `;
};
