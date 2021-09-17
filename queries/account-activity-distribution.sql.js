const { sql } = require('slonik');

// Sample response:
// [{".9999":16082,".999":6017,".995":917,".99":139,".98":46,".97":30,".96":22,".95":18,".94":16,".93":14,".92":13,".91":12,".90":11,".85":8,".80":5,".70":2,".60":2,".50":2,"total":497556}]

module.exports = () => {
  return sql`
    select
      percentile_disc(0.9999) within group (order by score) as ".9999",
      percentile_disc(0.999) within group (order by score) as ".999",
      percentile_disc(0.995) within group (order by score) as ".995",
      percentile_disc(0.99) within group (order by score) as ".99",
      percentile_disc(0.98) within group (order by score) as ".98",
      percentile_disc(0.97) within group (order by score) as ".97",
      percentile_disc(0.96) within group (order by score) as ".96",
      percentile_disc(0.95) within group (order by score) as ".95",
      percentile_disc(0.94) within group (order by score) as ".94",
      percentile_disc(0.93) within group (order by score) as ".93",
      percentile_disc(0.92) within group (order by score) as ".92",
      percentile_disc(0.91) within group (order by score) as ".91",
      percentile_disc(0.90) within group (order by score) as ".90",
      percentile_disc(0.85) within group (order by score) as ".85",
      percentile_disc(0.80) within group (order by score) as ".80",
      percentile_disc(0.70) within group (order by score) as ".70",
      percentile_disc(0.60) within group (order by score) as ".60",
      percentile_disc(0.50) within group (order by score) as ".50",
      count(*) as total
    from
      account
  `;
};
