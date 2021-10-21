create extension "uuid-ossp";

create table badge_group (
  id uuid default uuid_generate_v4() primary key,
  function_name text,
  group_name text
);

create table badge (
  id uuid default uuid_generate_v4() primary key,
  badge_group_id uuid,
  badge_name text not null,
  badge_description text not null,
  rarity_fraction numeric(16,16) default 0,
  href text default null,
  required_value numeric
);

create table account_badge (
  id uuid default uuid_generate_v4() primary key,
  account_id text,
  badge_group_id uuid,
  attained_value numeric
);

create unique index unique_badge_function_name on badge_group using btree (function_name);
create unique index unique_account_badge_account_and_group_id on account_badge using btree (account_id, badge_group_id);

alter table badge
  add constraint fk_badge_badge_group_id  -- convention: index type + table name + column name
  foreign key (badge_group_id)
  references badge_group (id)
    on delete cascade
    on update cascade;

alter table account_badge
  add constraint fk_account_badge_account_id  -- convention: index type + table name + column name
  foreign key (account_id)
  references account (account_id)
    on delete cascade
    on update cascade,
  add constraint fk_account_badge_badge_group_id  -- convention: index type + table name + column name
  foreign key (badge_group_id)
  references badge_group (id)
    on delete cascade
    on update cascade;
