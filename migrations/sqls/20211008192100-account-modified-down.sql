drop trigger if exists update_account_modified on account;
drop function if exists update_modified_column;

alter table account drop column modified;
