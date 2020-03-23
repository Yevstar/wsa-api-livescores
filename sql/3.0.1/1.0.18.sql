drop view if exists `team_ladder`;
create view team_ladder as
select team.logoUrl as logoUrl
     , team.`name` as name
     , team.id as id
     , divisionId
     , competitionId
     , IFNULL(sum(games_played), 0)                                       as P
     , IFNULL(sum(won), 0)                                                as W
     , IFNULL(sum(lost), 0)                                               as L
     , IFNULL(sum(draw), 0)                                               as D
     , IFNULL(sum(goals_for), 0)                                          as F
     , IFNULL(sum(goals_against), 0)                                      as A
     , IFNULL(sum(won_points) + sum(lost_points) + sum(draw_points), 0)   as Pts
     , IFNULL(sum(goals_for) / sum(goals_against) / sum(games_played), 0) as SMR
from team
         left join (
    select team1id                                 as teamId
         , sum(IF(team1resultId = 1, 1, 0)) As won
         , sum(IF(team1resultId = 2, 1, 0)) As lost
         , sum(IF(team1resultId = 3, 1, 0)) As draw
         , sum(IF(team1resultId = 1, c.points, 0)) As won_points
         , sum(IF(team1resultId = 2, c.points, 0)) As lost_points
         , sum(IF(team1resultId = 3, c.points, 0)) As draw_points
         , sum(team1score)                         As goals_for
         , sum(team2score)                         As goals_against
         , sum(1)                                  As games_played
    from `match` m,
         competition_ladder_settings c
    where m.team1resultId = c.resultTypeId
      and m.competitionId = c.`competitionId` and c.deleted_at is null
    group By team1id
    UNION
    select team2id                                 as teamId
         , sum(IF(team2resultId = 1, 1, 0)) As won
         , sum(IF(team2resultId = 2, 1, 0)) As lost
         , sum(IF(team2resultId = 3, 1, 0)) As draw
         , sum(IF(team2resultId = 1, c.points, 0)) As won_points
         , sum(IF(team2resultId = 2, c.points, 0)) As lost_points
         , sum(IF(team2resultId = 3, c.points, 0)) As draw_points
         , sum(team2score)                         As goals_for
         , sum(team1score)                         As goals_against
         , sum(1)                                  As games_played
    from `match` m,
         competition_ladder_settings c
    where m.team2resultId = c.resultTypeId
      and m.competitionId = c.`competitionId` and c.deleted_at is null
    group By team2id
) b on b.teamId = team.id
group by team.`name`, team.Id, divisionId, competitionId;
