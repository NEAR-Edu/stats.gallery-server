alter table last_update
  add column cron_name text unique,
  add column block_timestamp numeric(20,0);

-- add name to the existing only column: accounts cache
update last_update set cron_name = 'ACCOUNTS_CACHE' where block_height > 0;

create type execution_outcome_status as ENUM (
  'UNKNOWN',
  'FAILURE',
  'SUCCESS_VALUE',
  'SUCCESS_RECEIPT_ID'
);

create table on_chain_transaction (
  transaction_hash text not null,
  index_in_chunk int4 not null,
  block_timestamp numeric(20,0) not null,
  signer_account_id text not null,
  signer_public_key text not null,
  nonce numeric(20, 0) not null,
  receiver_account_id text not null,
  signature text not null,
  status execution_outcome_status not null,
  receipt_conversion_gas_burnt numeric(20,0),
  receipt_conversion_tokens_burnt numeric(45,0)
);

create index on_chain_transaction_block_timestamp on on_chain_transaction using btree (block_timestamp);
