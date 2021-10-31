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

with nft_badge_group as (
	select id from badge_group where function_name = 'badge-nft'
)
insert into
  badge (badge_group_id, badge_name, badge_description, rarity_fraction, href, required_value)
values ((select id from nft_badge_group), 'One-of-a-kind', 'Receive an NFT', 0.009637601848473794, null, 1);

with badge_transfer_group as (
	select id from badge_group where function_name = 'badge-transfer'
)
insert into
  badge (badge_group_id, badge_name, badge_description, rarity_fraction, href, required_value)
values ((select id from badge_transfer_group), 'Join the party!', 'Perform a token transfer', 0.44491, null, 1);

with badge_transfer_group as (
	select id from badge_group where function_name = 'badge-transfer'
)
insert into
  badge (badge_group_id, badge_name, badge_description, rarity_fraction, href, required_value)
values ((select id from badge_transfer_group), 'Raining', 'Transfer tokens 10 times', 0.0084142, null, 10);

with badge_transfer_group as (
	select id from badge_group where function_name = 'badge-transfer'
)
insert into
  badge (badge_group_id, badge_name, badge_description, rarity_fraction, href, required_value)
values ((select id from badge_transfer_group), 'Powertrain', 'Transfer tokens 100 times', 0.00063829, null, 100);

with validator_badge_group as (
	select id from badge_group where function_name = 'badge-stake'
)
insert into
  badge (badge_group_id, badge_name, badge_description, rarity_fraction, href, required_value)
values ((select id from validator_badge_group), 'ca$h flow', 'Stake tokens with a validator', 0.038507, null, 100);

with smart_contract_badge_group as (
	select id from badge_group where function_name = 'badge-deploy'
)
insert into
  badge (badge_group_id, badge_name, badge_description, rarity_fraction, href, required_value)
values ((select id from smart_contract_badge_group), 'I am Web 3', 'Deploy a smart contract', 0.011375, null, 100);
