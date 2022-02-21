import { BadgeService } from './badgeService';
import { createPool, DatabasePool, sql, QueryResultRow } from 'slonik';
import { createClient } from 'redis';
import badgeTransferSql from '../../queries/badge-transfer.sql';
import badgeFunctionDetails from '../../queries/badge-function-details.sql';
import insertOrUpdateAccountBadge from '../../queries/badge-service/insertOrUpdate.sql';
import determineAchievedBadges from './determineAchievedBadges';

interface TransferBadgeSpec {
  dbConnectionString: string;
  statsGalleryConnectionString: string;
}

export default (spec: TransferBadgeSpec): BadgeService => {
  const serviceName = 'badge_transfer_service';
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

  const isBadgeAttained = async (
    accountId: string,
  ): Promise<readonly any[]> => {
    const redisKey = serviceName + '_' + accountId;
    const cachedValue = await cacheLayer.get(redisKey);
    if (cachedValue !== null) {
      return JSON.parse(cachedValue) as readonly any[];
    }

    const transferBadges = await statsGalleryCache.query(
      badgeFunctionDetails('badge-transfer'),
    );

    const result = await indexerPool.one(
      badgeTransferSql({ account_id: accountId }),
    );

    const performedTransfer = Boolean(result.result);

    if (performedTransfer) {
      const transfers = Number(result!.result) || 0;
      const badges = determineAchievedBadges(transfers, transferBadges.rows);

      const badgeAttained = badges.some(badge => badge.achieved);
      if (badgeAttained) {
        await statsGalleryCache.query(
          insertOrUpdateAccountBadge(
            badges[0].badge_group_id,
            transfers,
            accountId,
          ),
        );
      }

      await cacheLayer.set(redisKey, JSON.stringify(badges), {
        EX: 3_600,
      });

      return badges as readonly any[];
    }

    // we set an expiration period for when the value we get is false as to give a chance
    // for redis to be replinished just in case the user completes the badge in the future
    await cacheLayer.set(redisKey, JSON.stringify([]), { EX: 600 });

    return [] as readonly any[];
  };

  return Object.freeze({
    IsBadgeAttained: isBadgeAttained,
    Init: init,
  });
};
