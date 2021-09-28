CREATE TABLE account (
    account_id text NOT NULL,
    balance numeric(45,0),
    score integer,
    created_at_block_timestamp numeric(20,0)
);

CREATE TABLE last_update (
    block_height numeric(20,0)
);

ALTER TABLE ONLY account
    ADD CONSTRAINT account_pkey PRIMARY KEY (account_id);

CREATE INDEX balance_ix ON account USING brin (balance);

CREATE INDEX score_ix ON account USING brin (score);
