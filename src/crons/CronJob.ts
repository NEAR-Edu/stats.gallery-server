export interface CronJob {
  get isEnabled(): boolean;
  get cronName(): string;
  get schedule(): string;
  run(): Promise<void>;
}
