ALTER TABLE IF EXISTS account
  ADD COLUMN modified timestamp without time zone DEFAULT current_timestamp;

-- https://stackoverflow.com/a/26284695
create or replace function update_modified_column()
returns trigger as $$
begin
  new.modified = now();
  return new;
end;
$$ language 'plpgsql';

create trigger update_account_modified
  before update on account
  for each row
  execute procedure update_modified_column();
