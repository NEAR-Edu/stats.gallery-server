alter table account_badge
  drop constraint fk_account_badge_account_id,
  add column temp_account_id uuid default gen_random_uuid();

alter table account
  add column id uuid default gen_random_uuid(),
  drop constraint account_pkey;

alter table account add constraint account_id_pkey primary key (id);

alter table account
  add constraint account_account_id_unique unique (account_id);

update account_badge 
  set temp_account_id = account.id
from account
where account_badge.account_id = account.account_id;

alter table account_badge drop column account_id;

alter table account_badge rename column temp_account_id to account_id; 

alter table account_badge
  add constraint fk_account_badge_account_id
  foreign key (account_id)
  references account (id)
    on delete cascade
    on update cascade;
