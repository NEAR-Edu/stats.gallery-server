CREATE TABLE user_percentile (
  percentile_name   varchar(200) NOT NULL PRIMARY KEY,
  percentile        numeric(16, 16) default 0
);
