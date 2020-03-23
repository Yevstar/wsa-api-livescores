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
     , IFNULL(sum(forfeit_won), 0)                                        as FW
     , IFNULL(sum(forfeit_loss), 0)                                       as FL
     , IFNULL(sum(won_points) + sum(lost_points) + sum(draw_points) + sum(fw_points) + sum(fl_points), 0)   as Pts
     , IFNULL(sum(goals_for) / sum(goals_against) / sum(games_played_minus_fw), 0) as SMR
from team
         left join (
    select team1id                                 as teamId
         , sum(IF(team1resultId = 1, 1, 0)) as won
         , sum(IF(team1resultId = 2, 1, 0)) as lost
         , sum(IF(team1resultId = 3, 1, 0)) as draw
         , sum(IF(team1resultId = 4, 1, 0)) as forfeit_won
         , sum(IF(team1resultId = 5, 1, 0)) as forfeit_loss
         , sum(IF(team1resultId = 1, c.points, 0)) as won_points
         , sum(IF(team1resultId = 2, c.points, 0)) as lost_points
         , sum(IF(team1resultId = 3, c.points, 0)) as draw_points
         , sum(IF(team1resultId = 4, c.points, 0)) as fw_points
         , sum(IF(team1resultId = 5, c.points, 0)) as fl_points
         , sum(team1score)                         as goals_for
         , sum(team2score)                         as goals_against
         , sum(1)                                  as games_played
         , sum(IF(team1resultId = 4, 0, 1))        as games_played_minus_fw
         
    from `match` m,
         competition_ladder_settings c
    where m.team1ResultId not in (8,9)
      and m.team1resultId = c.resultTypeId
      and m.competitionId = c.`competitionId`
      and c.deleted_at is null
    group By team1id
    UNION
    select team2id                                 as teamId
         , sum(IF(team2resultId = 1, 1, 0)) as won
         , sum(IF(team2resultId = 2, 1, 0)) as lost
         , sum(IF(team2resultId = 3, 1, 0)) as draw
         , sum(IF(team2resultId = 4, 1, 0)) as forfeit_won
         , sum(IF(team2resultId = 5, 1, 0)) as forfeit_loss
         , sum(IF(team2resultId = 1, c.points, 0)) as won_points
         , sum(IF(team2resultId = 2, c.points, 0)) as lost_points
         , sum(IF(team2resultId = 3, c.points, 0)) as draw_points
         , sum(IF(team2resultId = 4, c.points, 0)) as fw_points
         , sum(IF(team2resultId = 5, c.points, 0)) as fl_points
         , sum(team2score)                         as goals_for
         , sum(team1score)                         as goals_against
         , sum(1)                                  as games_played
         , sum(IF(team2resultId = 4, 0, 1))        as games_played_minus_fw
    from `match` m,
         competition_ladder_settings c
    where team2ResultId not in (8,9)
      and m.team2resultId = c.resultTypeId
      and m.competitionId = c.`competitionId`
      and c.deleted_at is null
    group By team2id
) b on b.teamId = team.id
group by team.`name`, team.Id, divisionId, competitionId;
