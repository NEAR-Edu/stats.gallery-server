import Router from '@koa/router';
import TopWeeklyDappService from '../../services/leaderboard/dapps';

interface LeaderboardControllerSpec {
  dbConnectionString: string;
  statsGalleryConnectionString: string;
  redisCacheConnectionString: string;
}

export default async (spec: LeaderboardControllerSpec): Promise<Router> => {
  const controllers = new Router();
  const {
    dbConnectionString,
    statsGalleryConnectionString,
    redisCacheConnectionString,
  } = spec;
  const topWeeklyDappService = TopWeeklyDappService({
    dbConnectionString,
    statsGalleryConnectionString,
    cacheConnectionString: redisCacheConnectionString,
  });

  try {
    await topWeeklyDappService.Init();
  } catch (error) {
    console.error(error);
  }

  controllers.get('/v2/leaderboard-dapps-week', async (ctx, next) => {
    try {
      const res = await topWeeklyDappService.GetLeaderboardStats();

      ctx.response.body = res;
    } catch (error) {
      console.error(error);
      ctx.response.status = 500;
    }

    await next();
  });

  return controllers;
};
