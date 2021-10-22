import { DatabasePoolType } from 'slonik';
import { CronJob } from './CronJob';
import { createCacheJob } from './cache';

export interface CronJobSpec {
  environment: Record<string, string>;
  cachePool: DatabasePoolType;
  indexerPool: DatabasePoolType;
}

export default function initCronJobs(spec: CronJobSpec): CronJob[] {
  return [createCacheJob(spec)];
}
