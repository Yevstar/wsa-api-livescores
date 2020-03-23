INSERT INTO `competition` (id, name) VALUES (1, 'A Competition');
INSERT INTO `competition` (id, name) VALUES (2, 'B Competition');

INSERT INTO division (id, name, age, grade) values (1, 'Under 13', 14, 'B');
INSERT INTO division (id, name, age, grade) values (2, 'Under 16', 13, 'A');

INSERT INTO venue (id, name, latitude, longitude) values (1, 'Manly Park', -33.7773447, 151.2720407);

INSERT INTO team (id, name, divisionId, logoUrl, competitionId) values (1, 'Tigers', 1, 'https://storage.googleapis.com/world-sport-action-images/team1.png', 1);
INSERT INTO team (id, name, divisionId, logoUrl, competitionId) values (2, 'Panthers', 1, 'https://storage.googleapis.com/world-sport-action-images/team2.png', 1);
INSERT INTO team (id, name, divisionId, logoUrl, competitionId) values (3, 'Lions', 1, 'https://storage.googleapis.com/world-sport-action-images/team3.png', 2);
INSERT INTO team (id, name, divisionId, logoUrl, competitionId) values (4, 'Leopard', 1, 'https://storage.googleapis.com/world-sport-action-images/team2.png', 1);
INSERT INTO team (id, name, divisionId, logoUrl, competitionId) values (5, 'Cheetahs', 1, 'https://storage.googleapis.com/world-sport-action-images/team2.png', 1);

INSERT INTO player (id, firstName, lastName, photoUrl, competitionId, teamId, dateOfBirth, phoneNumber) values (1, 'Dan', 'Walker', 'https://storage.googleapis.com/world-sport-action-images/player4.jpg', 1, 5, '2010-01-01', '0430928571');
INSERT INTO player (id, firstName, lastName, photoUrl, competitionId, teamId, dateOfBirth, phoneNumber) values (2, 'Fay', 'Roberson', 'https://storage.googleapis.com/world-sport-action-images/player5.jpg', 1, 1, '2010-01-01', '0430928571');
INSERT INTO player (id, firstName, lastName, photoUrl, competitionId, teamId, dateOfBirth, phoneNumber) values (3, 'Peter', 'Delahunty', 'https://storage.googleapis.com/world-sport-action-images/player6.jpg', 1, 1, '2010-01-01', '0430928571');
INSERT INTO player (id, firstName, lastName, photoUrl, competitionId, teamId, dateOfBirth, phoneNumber) values (4, 'Chloe', 'Kim', 'https://storage.googleapis.com/world-sport-action-images/player1.jpg', 1, 2, '2010-01-01', '0430928571');
INSERT INTO player (id, firstName, lastName, photoUrl, competitionId, teamId, dateOfBirth, phoneNumber) values (5, 'Alana', 'Blanchette', 'https://storage.googleapis.com/world-sport-action-images/player2.jpg', 1, 2, '2010-01-01', '0430928571');
INSERT INTO player (id, firstName, lastName, photoUrl, competitionId, teamId, dateOfBirth, phoneNumber) values (6, 'Lane', 'Beachley', 'https://storage.googleapis.com/world-sport-action-images/player3.jpg', 1, 2, '2010-01-01', '0430928571');

INSERT INTO `match` (id, startTime, team1Id, team2Id, venueId, competitionId, divisionId, `type`, matchDuration, breakDuration, mainBreakDuration, mnbMatchId) values (1, '2019-01-31 09:00:00', 1, 2, 1, 1, 1, 'FOUR_QUARTERS', 120, 240, 5, 5164035);
INSERT INTO `match` (id, startTime, team1Id, team2Id, venueId, competitionId, divisionId, `type`, matchDuration, breakDuration, mainBreakDuration, mnbMatchId) values (2, '2019-01-31 10:00:00', 1, 4, 1, 1, 1, 'FOUR_QUARTERS', 120, 240, 5, 5164035);
INSERT INTO `match` (id, startTime, team1Id, team2Id, venueId, competitionId, divisionId, `type`, matchDuration, breakDuration, mainBreakDuration, mnbMatchId) values (3, '2019-01-31 11:00:00', 1, 5, 1, 1, 1, 'FOUR_QUARTERS', 120, 240, 5, 5164035);
INSERT INTO `match` (id, startTime, team1Id, team2Id, venueId, competitionId, divisionId, `type`, matchDuration, breakDuration, mainBreakDuration, mnbMatchId) values (4, '2019-01-31 12:00:00', 2, 5, 1, 1, 1, 'FOUR_QUARTERS', 120, 240, 5, 5164035);
INSERT INTO `match` (id, startTime, team1Id, team2Id, venueId, competitionId, divisionId, `type`, matchDuration, breakDuration, mainBreakDuration, mnbMatchId) values (5, '2019-01-31 13:00:00', 2, 4, 1, 1, 1, 'FOUR_QUARTERS', 120, 240, 5, 5164035);
INSERT INTO `match` (id, startTime, team1Id, team2Id, venueId, competitionId, divisionId, `type`, matchDuration, breakDuration, mainBreakDuration, mnbMatchId) values (6, '2019-01-31 14:00:00', 1, 2, 1, 1, 1, 'FOUR_QUARTERS', 120, 240, 5, 5164035);

INSERT INTO wsa.club (id, name, logoUrl) VALUES (1, 'AdminClub', 'https://www.designevo.com/res/templates/thumb_small/brown-circle-and-chocolate-coffee.png');
INSERT INTO wsa.club (id, name, logoUrl) VALUES (2, 'Avengers', 'https://www.redwolf.in/image/catalog/stickers/marvel-avengers-logo-sticker.jpg');
INSERT INTO wsa.club (id, name, logoUrl) VALUES (3, 'Justice League', 'http://www.followingthenerd.com/site/wp-content/uploads/justice-league-logo.jpg');