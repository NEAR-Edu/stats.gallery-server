import { BadgeService } from './badgeService';
import { createPool, DatabasePool, sql } from 'slonik';
import { createClient, RedisClientType } from 'redis';
import badgeNftSql from '../queries/badge-nft.sql';

interface NFTBadgeSpec {
  accountId: string;
  nearNetwork: string;
  dbConnectionString: string;
  statsGalleryConnectionString: string;
}

export default (spec: NFTBadgeSpec): BadgeService => {
  const serviceName = 'badge_nft_service';
  const cacheLayer = createClient({ url: process.env['REDIS_URL'] });
  let indexerPool: DatabasePool;
  let statsGalleryCache: DatabasePool;

  const init = async () => {
    await cacheLayer.connect();

    indexerPool = createPool(spec.dbConnectionString, {
      maximumPoolSize: 5,
      statementTimeout: 'DISABLE_TIMEOUT',
      idleTimeout: 'DISABLE_TIMEOUT',
      idleInTransactionSessionTimeout: 'DISABLE_TIMEOUT',
    });

    statsGalleryCache = createPool(spec.statsGalleryConnectionString, {
      maximumPoolSize: 5,
      statementTimeout: 'DISABLE_TIMEOUT',
      idleTimeout: 'DISABLE_TIMEOUT',
      idleInTransactionSessionTimeout: 'DISABLE_TIMEOUT',
    });
  };

  const getAccountNFTTransferRecord = async (
    accountId: string,
  ): Promise<boolean> => {
    try {
      await statsGalleryCache.one(
        sql`select
              account_badge.id
            from
              account_badge
            inner join
              badge
            on
              badge.badge_group_id = account_badge.badge_group_id
            where
              account_badge.account_id = ${accountId} and badge.badge_name = 'One-of-a-kind'`,
      );
      return true;
    } catch (error) {
      return false;
    }
  };

  const isBadgeAttained = async (): Promise<boolean> => {
    // check the redis cache first
    // if redis cache is not empty, return result
    // else, query the accounts_badge table.
    // if record was found in the accounts table, store it in the redis database then return
    // else query the indexerPool and return the result
    const redisKey = serviceName + '_' + spec.accountId;
    const cachedValue = await cacheLayer.get(redisKey);
    if (cachedValue !== null) {
      return Boolean(cachedValue);
    }

    const isRecordPresent = await getAccountNFTTransferRecord(spec.accountId);

    if (isRecordPresent) {
      await cacheLayer.set(redisKey, 'true');

      return true;
    }

    const result = await indexerPool.any(
      badgeNftSql({ account_id: spec.accountId }),
    );

    const performedNFTTransfer = Boolean(result);

    if (performedNFTTransfer) {
      await cacheLayer.set(redisKey, 'true');
      await statsGalleryCache.query(
        sql`insert into account_badge (badge_group_id, attained_value, account_id)
        values ((select badge_group_id from badge where badge_name = 'One-of-a-kind'), ${parseInt(
          result as unknown as string,
        )}, ${spec.accountId})`,
      );
    }

    return performedNFTTransfer;
  };

  return Object.freeze({
    // TODO: replace this
    IsBadgeAttained: isBadgeAttained,
    Init: init,
  });
};
