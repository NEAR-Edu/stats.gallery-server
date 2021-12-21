import { DatabasePool } from 'slonik';
import { CronJob } from './CronJob';
import { createCacheJob } from './cache';

export interface CronJobSpec {
  environment: Record<string, string>;
  cachePool: DatabasePool;
  indexerPool: DatabasePool;
}

export default function initCronJobs(spec: CronJobSpec): CronJob[] {
  return [createCacheJob(spec)];
}
