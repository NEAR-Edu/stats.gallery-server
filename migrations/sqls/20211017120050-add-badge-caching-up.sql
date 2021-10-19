create table badge_group (
  id uuid primary key,
  group_name text
);

create table badge (
  id uuid primary key,
  badge_group_id uuid,
  badge_name text not null,
  badge_description text not null,
  rarity_fraction numeric(16,16) default 0,
  href text default null,
  required_value numeric
);

alter table badge
  add constraint fk_badge_group_id
  foreign key (badge_group_id)
  references badge_group (id)
    on delete cascade
    on update cascade;
