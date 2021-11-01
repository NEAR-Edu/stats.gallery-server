export interface TimestampRange {
  after_block_timestamp?: number;
  before_block_timestamp?: number;
}

export interface Params extends TimestampRange {
  account_id: string;
}
