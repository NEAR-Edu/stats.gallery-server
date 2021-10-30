insert into
  badge_group (function_name, group_name)
values ('badge-nft', 'NFT badges');

insert into
  badge_group (function_name, group_name)
values ('badge-transfer', 'Coin transfer badges');

insert into
  badge_group (function_name, group_name)
values ('badge-stake', 'Staking badges');

insert into
  badge_group (function_name, group_name)
values ('badge-deploy', 'Smart contract deployment badges');

select function_name into nft_badge from badge

-- with nft_badge_group as (
-- 	select id from badge_group where function_name = 'badge-nft'
-- )
-- insert into
--   badge (badge_group_id, badge_name, badge_description, rarity_fraction, href, required_value)
-- values ((select id from nft_badge_group), 'One-of-a-kind', 'Receive an NFT', 0, null, 1);
