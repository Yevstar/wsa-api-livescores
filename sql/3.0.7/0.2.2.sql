RENAME TABLE wsa.entityType TO wsa.xx_entityType,
             wsa.role TO wsa.xx_role,
             wsa.userRoleEntity TO wsa.xx_userRoleEntity,
             wsa.user TO wsa.xx_user,
             wsa.function TO wsa.xx_function,
             wsa.functionRole TO wsa.xx_functionRole;

RENAME TABLE wsa.linked_entities TO wsa.xx_linked_entities;

RENAME TABLE wsa.competitionVenue TO wsa.xx_competitionVenue,
             wsa.venue TO wsa.xx_venue;
