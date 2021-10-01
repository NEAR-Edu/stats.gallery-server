const { sql } = require('slonik');

module.exports = params => {
  let query;
  if (params.select) {
    const selectParams = {
      '*': sql`*`,
      account_id: sql`account_id`,
      balance: sql`balance::text`,
      score: sql`score`,
      created_at_block_timestamp: sql`created_at_block_timestamp`,
      stake: sql`stake`,
      level: sql`level`,
    };
    let selectQuery = [];
    for (const s of params.select.split(',')) {
      const query = selectParams[s];
      if (!query) continue;
      selectQuery.push(query);
    }
    if (selectQuery.length === 0) {
      query = sql`select *, balance::text from account`;
    } else {
      query = sql`select ${sql.join(selectQuery, sql`, `)} from account`;
    }
  } else {
    query = sql`select *, balance::text from account`;
  }
  if (params.account_id != null) {
    query = sql`${query} where account_id = ${params.account_id}`;
  } else {
    query = sql`${query}
      where balance is not null and score is not null
      and account_id not like '%.lockup.near'
      and account_id not like '%.poolv1.near'
      and account_id not like 'nfeco__.near'
      and account_id not like 'nfendowment__.near'
    `;
  }
  if (params.stake != null) {
    query = sql`${query} and stake is ${params.stake === '1' ? sql`true` : sql`false`}`;
  }
  if (params.minlevel != null) {
    query = sql`${query} and level >= ${params.minlevel}`;
  }
  if (params.maxlevel != null) {
    query = sql`${query} and level <= ${params.maxlevel}`;
  }
  if (params.account_id_like != null) {
    query = sql`${query} and account_id like ${params.account_id_like}`;
  }
  if (params.account_id_not_like != null) {
    query = sql`${query} and account_id not like ${params.account_id_not_like}`;
  }
  if (params.created_before != null) {
    query = sql`${query} and created_at_block_timestamp <= ${params.created_before}`;
  }
  if (params.created_after != null) {
    query = sql`${query} and created_at_block_timestamp >= ${params.created_after}`;
  }
  query = sql`${query}
    order by account.score desc
    limit ${params.limit || 100}
  `;
  if (params.offset != null) {
    query = sql`${query} offset ${params.offset}`;
  }
  return query;
};
