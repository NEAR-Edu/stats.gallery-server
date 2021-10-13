const fs = require('fs/promises');
const { sql } = require('slonik');
const { sleep } = require('../utils/sleep');
const accountCreationSql = require('../queries/account-creation.sql');
const scoreSql = require('../queries/score-calculate.sql');

class LeaderboardCache {
  constructor(statsGalleryCachePool, indexerCachePool, environment) {
    this.cachePool = statsGalleryCachePool;

    this.indexerPool = indexerCachePool;

    this.environmentVar = environment;
  }

  isEnabled() {
    return this.environmentVar['NO_UPDATE_CACHE'];
  }

  cronName() {
    return 'LEADERBOARDCACHE';
  }

  schedule() {
    return '*/10 * * * *'; // every 10 minutes
  }

  async queryUpdatedAccountsFromIndexer(sinceBlockHeight) {
    const queryResult = await this.indexerPool.many(sql`
      select account_id,
        last_update_block_height
      from accounts
      where deleted_by_receipt_id is null
      and last_update_block_height >= ${sinceBlockHeight}
    `);

    const accounts = [];
    let lastUpdateBlockHeight = 0;

    for (const record of queryResult) {
      accounts.push(record.account_id + '');
      if (record.last_update_block_height > lastUpdateBlockHeight) {
        lastUpdateBlockHeight = record.last_update_block_height;
      }
    }

    return { accounts, lastUpdateBlockHeight };
  }

  async queryAllAccountsFromIndexer() {
    const queryResult = await this.indexerPool.many(sql`
      select account_id,
        last_update_block_height
      from accounts
      where deleted_by_receipt_id is null
    `);

    const accounts = [];
    let lastUpdateBlockHeight = 0;

    for (record of queryResult) {
      accounts.push(record.account_id + '');
      if (record.last_update_block_height > lastUpdateBlockHeight) {
        lastUpdateBlockHeight = record.last_update_block_height;
      }
    }

    return { accounts, lastUpdateBlockHeight };
  }

  /** @typedef {{ account_id: string; balance: string; score: number; }} AccountRecord */
  /** @type {() => Promise<AccountRecord[]>} */
  async queryAllAccountsFromCache() {
    try {
      const res = await this.cachePool.many(sql`
        select * from account
      `);
      return res;
    } catch (err) {
      // not yet initialized
      return [];
    }
  }

  /** @type {() => Promise<number>} */
  async queryLastUpdateBlockHeightFromCache() {
    try {
      const res = await this.cachePool.oneFirst(sql`
        select block_height from last_update
      `);
      return res;
    } catch (err) {
      return 0;
    }
  }

  writeAccountIds(accounts) {
    return this.cachePool.connect(async (connection) => {
      const groups = [];
      const size = 100;
      const l = Array.from(accounts);
      while (l.length > 0) {
        groups.push(l.splice(0, size));
      }

      await connection.query(sql`
        create temporary table new_account_id (account_id text)
      `);

      for (const group of groups) {
        await connection.query(sql`
          insert into new_account_id
            values (
              ${sql.join(group, sql`), (`)}
            )
        `);
      }

      await connection.query(sql`
        -- avoid uniqueness violation errors
        insert into account
          select account_id from new_account_id
          where not exists (
            select 1 from account t_b
            where t_b.account_id = new_account_id.account_id
          );

        drop table new_account_id;
      `);
    });
  }

  async fileExists(...paths) {
    try {
      await Promise.all(paths.map((path) => fs.access(path)));
      return true;
    } catch (e) {
      return false;
    }
  }

  writeLastUpdateBlockHeight(lastUpdateBlockHeight) {
    return this.cachePool.query(sql`
      -- single row table, so no where clause necessary
      update last_update set block_height = ${lastUpdateBlockHeight}
    `);
  }

  async loadAccounts() {
    const cachedAccounts = await this.queryAllAccountsFromCache();
    const cachedLastUpdateBlockHeight =
      await this.queryLastUpdateBlockHeightFromCache();

    const { accounts: accountsToUpdate, lastUpdateBlockHeight } =
      await this.queryUpdatedAccountsFromIndexer(cachedLastUpdateBlockHeight);

    return {
      cachedAccounts,
      accountsToUpdate,
      lastUpdateBlockHeight,
    };
  }

  async getAccountScore(account) {
    return await this.indexerPool.oneFirst(scoreSql({ account_id: account }));
  }

  async getAccountBalance(account) {
    return await this.indexerPool.oneFirst(sql`
      select t_a.affected_account_nonstaked_balance as balance
      from account_changes t_a
      left outer join account_changes t_b on t_a.affected_account_id = t_b.affected_account_id
      and t_a.changed_in_block_timestamp < t_b.changed_in_block_timestamp
      where t_b.affected_account_id is null
        and t_a.affected_account_id = ${account}
        limit 1
    `);
  }

  async getAccountCreated(account) {
    try {
      const created = await this.indexerPool.oneFirst(
        accountCreationSql({ account_id: account }),
      );
      return created;
    } catch (err) {
      if (err instanceof Error && err.name === 'NotFoundError') {
        return null;
      }
      throw err;
    }
  }

  async queryAndUpdate(name, accounts, queryFn, updateFn) {
    const maxSimultaneousRequests = 10;

    let group = [];
    for (let i = 0; i < accounts.length; i++) {
      if (i > 0 && i % 1000 === 0) {
        console.log(
          `${name} cache update: ${i} / ${accounts.length} (${(
            (i * 100) /
            accounts.length
          ).toFixed(2)}%)`,
        );
      }

      if (group.length >= maxSimultaneousRequests) {
        // console.log('group', i / maxSimultaneousRequests);

        await Promise.all(
          group.map(async (account, j) => {
            let remainingRetries = 3;
            let err;
            while (remainingRetries > 0) {
              try {
                const value = await queryFn(account);
                await updateFn(account, value);
                // console.log('Updated ', account);
                return;
              } catch (e) {
                // oh well
                err = e;
                remainingRetries--;
                await sleep(2000);
              }
            }
            console.log(
              `Query ${name} ${i + j} failed on account ${account}, ${err}`,
            );
          }),
        );

        // be nice
        // await sleep(100);

        group = [];
      }

      group.push(accounts[i]);
    }
  }

  async queryBalancesFromIndexerAndUpdate(accounts) {
    const maxSimultaneousRequests = 10;

    const balances = new Map();

    let group = [];
    for (let i = 0; i < accounts.length; i++) {
      if (i > 0 && i % 1000 === 0) {
        console.log('Leaderboard cache update', i);
      }

      if (group.length >= maxSimultaneousRequests) {
        // console.log('group', i / maxSimultaneousRequests);

        await Promise.all(
          group.map(async (account) => {
            try {
              const [balance, score] = await Promise.all([
                this.getAccountBalance(account),
                this.getAccountScore(account),
              ]);
              await this.writeBalanceAndScore(account, balance, score);
              // console.log('wrote balance and score for', account);
              balances.set(account, balance);
            } catch (e) {
              // oh well
              console.log('Unable to query and write balance for ', account, e);
            }
          }),
        );

        // be nice
        // await sleep(100);

        group = [];
      }

      group.push(accounts[i]);
    }

    return balances;
  }

  /** @type {() => Promise<string[]>} */
  queryAccountsWithNullsFromCache() {
    return this.cachePool.manyFirst(sql`
      select account_id from account
        where balance is null
          or score is null
          or created_at_block_timestamp is null
    `);
  }

  /** @type {() => Promise<string[]>} */
  queryAccountsWithNullBalanceFromCache() {
    return this.cachePool.manyFirst(sql`
      select account_id from account
        where balance is null
    `);
  }

  /** @type {() => Promise<string[]>} */
  queryAccountsWithNullScoreFromCache() {
    return this.cachePool.manyFirst(sql`
      select account_id from account
        where score is null
    `);
  }

  /** @type {() => Promise<string[]>} */
  queryAccountsWithNullCreatedFromCache() {
    return this.cachePool.manyFirst(sql`
      select account_id from account
        where created_at_block_timestamp is null
    `);
  }

  writeBalance(account, balance) {
    return this.cachePool.query(sql`
      update account
        set balance = ${balance}
        where account_id = ${account}
    `);
  }

  writeScore(account, score) {
    return this.cachePool.query(sql`
      update account
        set score = ${score}
        where account_id = ${account}
    `);
  }

  writeCreated(account, created) {
    if (created == null) return;
    return this.cachePool.query(sql`
      update account
        set created_at_block_timestamp = ${created}
        where account_id = ${account}
    `);
  }

  writeBalanceAndScore(account, balance, score) {
    return this.cachePool.query(sql`
      update account
        set score = ${score},
          balance = ${balance}
        where account_id = ${account}
    `);
  }

  writeBalances(/** @type {Map<string, string>} */ balances) {
    for (const [account, balance] in balances.entries()) {
      this.writeBalance(account, balance);
    }
  }

  async run() {
    console.log('Loading accounts...');
    const { cachedAccounts, accountsToUpdate, lastUpdateBlockHeight } =
      await this.loadAccounts();
    console.log('Done loading accounts');

    console.log('Writing account ids...');
    await this.writeAccountIds(accountsToUpdate);
    console.log('Done writing account ids');
    // We don't much care to wait for this async function to complete
    this.writeLastUpdateBlockHeight(lastUpdateBlockHeight);

    const [updateBalanceAccounts, updateScoreAccounts, updateCreatedAccounts] =
      await Promise.all([
        this.queryAccountsWithNullBalanceFromCache(),
        this.queryAccountsWithNullScoreFromCache(),
        this.queryAccountsWithNullCreatedFromCache(),
      ]);

    console.log('Null balance:', updateBalanceAccounts.length);
    console.log('Null score:', updateScoreAccounts.length);
    console.log('Null created:', updateCreatedAccounts.length);

    console.log('Updates to new/stale accounts', accountsToUpdate.length);

    await Promise.all([
      this.queryAndUpdate(
        'Balance',
        updateBalanceAccounts.concat(accountsToUpdate),
        (account) => this.getAccountBalance(account),
        (account, value) => this.writeBalance(account, value),
      ),
      this.queryAndUpdate(
        'Score',
        updateScoreAccounts.concat(accountsToUpdate),
        (account) => this.getAccountScore(account),
        (account, value) => this.writeScore(account, value),
      ),
      this.queryAndUpdate(
        'Created',
        updateCreatedAccounts.concat(accountsToUpdate),
        (account) => this.getAccountCreated(account),
        (account, value) => this.writeCreated(account, value),
      ),
    ]);

    console.log('Done writing updates.');
  }
}

module.exports = {
  LeaderboardCache,
};
