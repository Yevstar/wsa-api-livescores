create or replace view wsa_users.linked_entities as
    SELECT c.id                                                   as inputEntityId,
           (SELECT id FROM wsa_users.entityType WHERE name = 'COMPETITION') as inputEntityTypeId,
           c.id                                                   as linkedEntityId,
           (SELECT id FROM wsa_users.entityType WHERE name = 'COMPETITION') as linkedEntityTypeId,
           c.name                                                 as linkedEntityName
    FROM wsa.competition c
    UNION
    SELECT c.id                                                   as inputEntityId,
           (SELECT id FROM wsa_users.entityType WHERE name = 'COMPETITION') as inputEntityTypeId,
           cl.id                                                  as linkedEntityId,
           (SELECT id FROM wsa_users.entityType WHERE name = 'CLUB')        as linkedEntityTypeId,
           cl.name                                                as linkedEntityName
    FROM wsa.competition c
             INNER JOIN wsa.club cl ON cl.competitionId = c.id
    UNION
    SELECT c.id                                                   as inputEntityId,
           (SELECT id FROM wsa_users.entityType WHERE name = 'COMPETITION') as inputEntityTypeId,
           t.id                                                   as linkedEntityId,
           (SELECT id FROM wsa_users.entityType WHERE name = 'TEAM')        as linkedEntityTypeId,
           t.name                                                 as linkedEntityName
    FROM wsa.competition c
             INNER JOIN wsa.team t ON t.competitionId = c.id
    UNION
    SELECT cl.id                                           as inputEntityId,
           (SELECT id FROM wsa_users.entityType WHERE name = 'CLUB') as inputEntityTypeId,
           cl.id                                           as linkedEntityId,
           (SELECT id FROM wsa_users.entityType WHERE name = 'CLUB') as linkedEntityTypeId,
           cl.name                                         as linkedEntityName
    FROM wsa.club cl
    UNION
    SELECT cl.id                                           as inputEntityId,
           (SELECT id FROM wsa_users.entityType WHERE name = 'CLUB') as inputEntityTypeId,
           t.id                                            as linkedEntityId,
           (SELECT id FROM wsa_users.entityType WHERE name = 'TEAM') as linkedEntityTypeId,
           t.name                                          as linkedEntityName
    FROM wsa.club cl
             INNER JOIN wsa.team t ON cl.id = t.clubId
    UNION
    SELECT t.id                                            as inputEntityId,
           (SELECT id FROM wsa_users.entityType WHERE name = 'TEAM') as inputEntityTypeId,
           t.id                                            as linkedEntityId,
           (SELECT id FROM wsa_users.entityType WHERE name = 'TEAM') as linkedEntityTypeId,
           t.name                                          as linkedEntityName
    FROM wsa.team t;

DROP VIEW wsa.test_user_linked_entity_roles;

DROP VIEW wsa.test_users;
