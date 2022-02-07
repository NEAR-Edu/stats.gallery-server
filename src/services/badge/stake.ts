import { BadgeService } from './badgeService';
import { createPool, DatabasePool, sql } from 'slonik';
import { createClient } from 'redis';
import badgeStakeSql from '../../queries/badge-stake.sql';

interface StakeBadgeSpec {
  dbConnectionString: string;
  statsGalleryConnectionString: string;
}

export default (spec: StakeBadgeSpec): BadgeService => {
  const serviceName = 'badge_stake_service';
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

    console.log(
      'Pool test:',
      spec.dbConnectionString,
      await indexerPool.one(sql`select 1 as should_be_1`),
    );

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

  const getAccountStakeRecord = async (accountId: string): Promise<boolean> => {
    try {
      await statsGalleryCache.one(
        sql`
        select
          account_badge.id
        from
          account_badge
        inner join
          badge
        on
          badge.badge_group_id = account_badge.badge_group_id
        inner join
          account
        on
          account.id = account_badge.account_id
        where
          account.account_id = ${accountId} and badge.badge_name = 'ca$h flow'`,
      );
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const isBadgeAttained = async (accountId: string): Promise<boolean> => {
    const redisKey = serviceName + '_' + accountId;
    const cachedValue = await cacheLayer.get(redisKey);
    if (cachedValue !== null) {
      return cachedValue === 'true';
    }

    const isRecordPresent = await getAccountStakeRecord(accountId);

    if (isRecordPresent) {
      await cacheLayer.set(redisKey, 'true');

      return true;
    }

    const result = await indexerPool.one(
      badgeStakeSql({ account_id: accountId }),
    );

    const performedTransfer = Boolean(result.result);

    if (performedTransfer) {
      await statsGalleryCache.query(
        sql`insert into account_badge (badge_group_id, attained_value, account_id)
        values (
          (select badge_group_id from badge where badge_name = 'ca$h flow'),
          ${result.result}, (select id from account where account_id = ${accountId}))`,
      );
      await cacheLayer.set(redisKey, 'true');
    }

    // we set an expiration period for when the value we get is false as to give a chance
    // for redis to be replinished just in case the user completes the badge in the future
    await cacheLayer.set(redisKey, 'false', { EX: 600 });

    return performedTransfer;
  };

  return Object.freeze({
    IsBadgeAttained: isBadgeAttained,
    Init: init,
  });
};
