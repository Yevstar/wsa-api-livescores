ALTER TABLE wsa.competition ADD COLUMN recordUmpireType varchar(255) DEFAULT 'NONE' after recordUmpire;

ALTER TABLE wsa.matchUmpires ADD COLUMN umpire1UserId int(11) DEFAULT null after umpire1ClubId;
ALTER TABLE wsa.matchUmpires ADD COLUMN umpire2UserId int(11) DEFAULT null after umpire2ClubId;
ALTER TABLE wsa.matchUmpires ADD COLUMN umpire3UserId int(11) DEFAULT null after umpire3ClubId;
