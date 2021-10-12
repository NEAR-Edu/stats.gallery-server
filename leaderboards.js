const { createPool, sql } = require('slonik');
const accountCreationSql = require('./queries/account-creation.sql');
const scoreSql = require('./queries/score-calculate.sql');

/**
 * @typedef {'created_at_block_timestamp' | 'balance' | 'score'} AccountColumn
 * @typedef {{ account_id: string; balance: string; score: number; created_at_block_timestamp: number; modified: number; }} AccountRecord
 */

class LeaderboardCache {
  constructor(cachePoolConnectionString, indexerPoolConnectionString) {
    /** @type {Map<AccountColumn, (accountId: string) => Promise<any>>} */
    this.cols = new Map(
      Object.entries({
        score: this.getAccountScore.bind(this),
        balance: this.getAccountBalance.bind(this),
        created_at_block_timestamp: this.getAccountCreated.bind(this),
      }),
    );

    this.cachePool = createPool(cachePoolConnectionString);

    this.indexerPool = createPool(indexerPoolConnectionString);

    process.on('exit', async () => {
      await Promise.all([this.indexerPool.end(), this.cachePool.end()]);
    });
  }

  async queryNewAccountsFromIndexer(sinceBlockHeight) {
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

  /** @type {(limit: number) => Promise<AccountRecord[]>} */
  async queryStaleAccountsFromCache(limit = 100) {
    try {
      return await this.cachePool.many(sql`
        select
          account_id,
          balance::text,
          score,
          created_at_block_timestamp,
          modified
        from account
        order by modified asc
        limit ${limit}
      `);
    } catch (e) {
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

  writeLastUpdateBlockHeight(lastUpdateBlockHeight) {
    return this.cachePool.query(sql`
      -- single row table, so no where clause necessary
      update last_update set block_height = ${lastUpdateBlockHeight}
    `);
  }

  async loadAccounts() {
    const cachedLastUpdateBlockHeight =
      await this.queryLastUpdateBlockHeightFromCache();

    const { accounts: newAccounts, lastUpdateBlockHeight } =
      await this.queryNewAccountsFromIndexer(cachedLastUpdateBlockHeight);

    return {
      newAccounts,
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

  /** @type {() => Promise<{ account_id: string; missing_columns: string; }[]>} */
  queryAccountsWithNullsFromCache() {
    const colNames = Array.from(this.cols.keys());

    return this.cachePool.many(sql`
      select account_id, concat(
        ${sql.join(
          colNames.map(
            (col) =>
              sql`case when ${sql.identifier([col])} is null then ${
                col + ','
              } else '' end`,
          ),
          sql`, `,
        )}
      ) as missing_columns
      from account
      where ${sql.join(
        colNames.map((col) => sql`${sql.identifier([col])} is null`),
        sql` or `,
      )}
    `);
  }

  async updateAccount(
    /** @type {string} */ accountId,
    /** @type {AccountColumn[]} */ columnsToUpdate,
  ) {
    let promises = [];
    let sets = [];

    this.cols.forEach((getter, colName) => {
      if (columnsToUpdate.includes(colName)) {
        promises.push(
          getter(accountId)
            .then((value) => {
              sets.push(sql`${sql.identifier([colName])} = ${value}`);
            })
            .catch((e) => {
              // ignore
              console.log('Could not get ' + colName + ' for ' + accountId);
            }),
        );
      }
    });

    await Promise.all(promises);

    if (sets.length) {
      return this.cachePool.query(sql`
        update account
          set ${sql.join(sets, sql`, `)}
          where account_id = ${accountId}
      `);
    } else {
      return Promise.reject('No updates procured');
    }
  }

  async update() {
    console.log('Loading accounts...');
    const { newAccounts, lastUpdateBlockHeight } = await this.loadAccounts();
    console.log('Done loading accounts');

    console.log('Writing account ids...');
    await this.writeAccountIds(newAccounts);
    console.log('Done writing account ids');

    console.log('Writing last update block height...');
    await this.writeLastUpdateBlockHeight(lastUpdateBlockHeight);
    console.log('Done writing last update block height');

    console.log('Loading accounts with nulls...');
    const accountsWithNulls = await this.queryAccountsWithNullsFromCache();
    console.log('Done loading accounts with nulls');

    console.log(
      'Updating ' + accountsWithNulls.length + ' accounts with nulls...',
    );

    const groupSize = 10;

    for (let i = 0; i < accountsWithNulls.length; i += groupSize) {
      console.log(
        `Accounts with nulls: ${i} / ${accountsWithNulls.length} (${(
          (i / accountsWithNulls.length) *
          100
        ).toFixed(2)}%)`,
      );

      await Promise.all(
        accountsWithNulls.slice(i, groupSize).map((record) =>
          this.updateAccount(
            record.account_id,

            // Trailing comma means we have an empty element at the end of the
            // array, but it doesn't matter
            record.missing_columns.split(','),
          ).catch((e) => {
            console.log('Could not update ' + record.account_id, e);
          }),
        ),
      );
    }

    console.log('Done updating accounts with nulls');
    console.log('Updating stale accounts...');

    let maxModified = 0;
    let i = 0;
    const day = 1000 * 60 * 60 * 24;

    // Accounts last modified earlier than staleTime should be updated
    const staleTime = day / 2;

    while (Date.now() - maxModified > staleTime) {
      console.log('Stale accounts group ' + i);
      console.log('Loading stale accounts...');
      const staleAccounts = await this.queryStaleAccountsFromCache(10);
      console.log('Done loading stale accounts');

      console.log('Updating ' + staleAccounts.length + ' stale accounts...');
      await Promise.all(
        staleAccounts.map((record) => {
          maxModified = Math.max(maxModified, record.modified);
          return this.updateAccount(record.account_id, [
            'balance',
            'score',
          ]).catch((e) => {
            console.log('Could not update ' + record.account_id, e);
          });
        }),
      );
      console.log('Done updating ' + staleAccounts.length + ' stale accounts');

      i++;
    }

    console.log('Done updating stale accounts');

    console.log('Done writing updates');
  }
}

module.exports = {
  LeaderboardCache,
};
