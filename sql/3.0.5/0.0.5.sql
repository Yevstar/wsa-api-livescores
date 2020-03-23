create index matchScores_period_index
    on matchScores (period);

§create index match_team1Id_index
    on `match` (team1Id);

create index match_team2Id_index
    on `match` (team2Id);

create index match_deleted_at_index
    on `match` (deleted_at);

create index match_endTime_index
    on `match` (endTime);

create index match_startTime_index
    on `match` (startTime);


