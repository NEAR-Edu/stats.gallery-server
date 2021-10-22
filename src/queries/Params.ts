export interface TimestampRange {
  after_block_timestamp?: number;
  before_block_timestamp?: number;
}

export interface LimitAndOffset {
  limit?: number,
  offset?: number
}

export interface Params extends TimestampRange, LimitAndOffset{
  account_id: string;
}
