alter table account_badge
  drop constraint fk_account_badge_account_id,
  add column temp_account_id text default '';

alter table account drop constraint account_account_id_unique;

update account_badge 
  set temp_account_id = account.account_id
from account
where account_badge.account_id = account.id;

alter table account_badge drop column account_id;

alter table account_badge rename column temp_account_id to account_id; 

alter table account drop column id;

alter table account add constraint account_pkey primary key (account_id);

alter table account_badge
  add constraint fk_account_badge_account_id
  foreign key (account_id)
  references account (account_id)
    on delete cascade
    on update cascade;
