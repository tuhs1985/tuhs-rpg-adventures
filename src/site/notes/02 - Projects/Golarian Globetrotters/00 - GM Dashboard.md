---
{"dg-publish":true,"permalink":"/02-projects/golarian-globetrotters/00-gm-dashboard/","tags":["gardenEntry"]}
---

## 1. Adventures

dataview
TABLE WITHOUT ID
  file.link AS "Name",
  status,
  campaign,
  party_level AS "APL",
  total_xp AS "XP",
  total_treasure_gp AS "Reward (gp)",
  regions
FROM ""
WHERE type = "adventure"
   OR contains(file.tags, "#adventure")
SORT status, file.name

