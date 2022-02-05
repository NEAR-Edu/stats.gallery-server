import { createPool, DatabasePool, sql } from 'slonik';
import { createClient } from 'redis';
import mostActiveWalletSql from '../../queries/most-active-wallet-within-range.sql';
import { DAY } from '../../utils/constants';

interface DAPPSpec {
  dbConnectionString: string;
  statsGalleryConnectionString: string;
  cacheConnectionString: string;
}

export default (spec: DAPPSpec): LeaderboardService => {
  const serviceName = 'leaderboard-dapps-week';
  const cacheLayer = createClient({ url: process.env['REDIS_URL'] });
  let indexerPool: DatabasePool;
  let statsGalleryCache: DatabasePool;

  const init = async () => {
    await cacheLayer.connect();

    indexerPool = createPool(spec.dbConnectionString, {
      maximumPoolSize: 30,
      statementTimeout: 'DISABLE_TIMEOUT',
      connectionTimeout: 'DISABLE_TIMEOUT',
      idleTimeout: 'DISABLE_TIMEOUT',
      // this has to be set manually as there is a misleading error in the slonik package
      // saying this is unknown when this is not manually set
      idleInTransactionSessionTimeout: 'DISABLE_TIMEOUT',
    });

    statsGalleryCache = createPool(spec.statsGalleryConnectionString, {
      maximumPoolSize: 30,
      statementTimeout: 'DISABLE_TIMEOUT',
      connectionTimeout: 'DISABLE_TIMEOUT',
      idleTimeout: 'DISABLE_TIMEOUT',
      // this has to be set manually as there is a misleading error in the slonik package
      // saying this is unknown when this is not manually set
      idleInTransactionSessionTimeout: 'DISABLE_TIMEOUT',
    });
  };

  const leaderBoardStats = async (): Promise<TopWeeklyDapp[]> => {
    const cachedResult = await cacheLayer.get(serviceName);
    if (cachedResult !== null) {
      const cachedJSONResult = JSON.parse(cachedResult);
      return cachedJSONResult as unknown as TopWeeklyDapp[];
    }

    const oneWeekAgo = Date.now() - DAY * 7;
    const accsWithNoOfTransactions = await statsGalleryCache.many(
      mostActiveWalletSql(
        { after_block_timestamp: oneWeekAgo * 1_000_000 },
        100,
      ),
    );

    const accounts: string[] = [];
    for (let acc of accsWithNoOfTransactions) {
      accounts.push(acc.account_id as string);
    }

    const accsWithContractDeployed = await indexerPool.query(
      sql`select 
          receipt_predecessor_account_id as account_id
        from
          action_receipt_actions where action_kind = 'DEPLOY_CONTRACT'
          and receipt_predecessor_account_id in (${accounts.join(',')})
        group by receipt_predecessor_account_id
        limit 100`,
    );

    const accLookupMap: Map<string, Boolean> = new Map();
    accsWithContractDeployed.rows.forEach(a => {
      if (!accLookupMap.has(a.account_id as string)) {
        accLookupMap.set(a.account_id as string, true);
      }
    });

    const res: TopWeeklyDapp[] = [];
    for (let acc of accsWithNoOfTransactions) {
      if (accLookupMap.has(acc.account_id as string)) {
        res.push(acc as unknown as TopWeeklyDapp);
      }

      if (res.length >= 5) {
        break;
      }
    }

    return res;
  };

  return Object.freeze({
    Init: init,
    GetLeaderboardStats: leaderBoardStats,
  });
};
