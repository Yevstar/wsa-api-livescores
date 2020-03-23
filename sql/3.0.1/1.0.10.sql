create view scorers as 
select roster.id, m.startTime, roster.userId, m.id as matchId, team.id as teamId, now() as created_at, now() as updated_at, NULL as deleted_at,
(case when roster.status = 'YES' then 'Accepted'
when roster.status = 'NO' then 'Declined'
when roster.status is null then 'Invited'
else 'Unknown'
end) as `status`, 
(case when roster.teamId = m.team2id then 'S2'
else 'S1'
end) as scorerType
from roster, `match` m, team
where roster.matchId = m.id
and roster.teamId = team.id
and roster.roleId = 4;


ALTER TABLE roster ADD COlUMN updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp();

ALTER TABLE roster ADD COlUMN created_at timestamp NOT NULL DEFAULT current_timestamp();
