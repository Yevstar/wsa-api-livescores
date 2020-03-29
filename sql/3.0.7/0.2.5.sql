DROP PROCEDURE IF EXISTS `wsa`.`usp_get_eventOccurrences` ;

DELIMITER $$

CREATE  PROCEDURE `wsa`.`usp_get_eventOccurrences`(
	p_userId int,
	p_managerRoleId int,
    p_playerRoleId int,
    p_teamEntityTypeId int,
    p_userEntityTypeId int
)
BEGIN
	IF(p_userId IS NOT NULL) THEN

		select distinct eo.id as id,
						eo.eventId as eventId,
						eo.startTime as startTime,
						eo.endTime as endTime,
						eo.allDay as allDay
				from wsa.eventOccurrence eo
			left join wsa.eventInvitee ei
				on (ei.eventId = eo.eventId)
			left join wsa_users.userRoleEntity ure
				on (ure.userId = p_userId and ure.roleId in (p_managerRoleId, p_playerRoleId) and ure.entityTypeId in (p_teamEntityTypeId, p_userEntityTypeId))
			left join wsa_users.linked_entities le
				on (le.linkedEntityId = ure.entityId and le.linkedEntityTypeId = ure.entityTypeId)
			where (eo.deleted_at is null)
			  and (le.inputEntityId = ei.entityId and le.inputEntityTypeId = ei.entityTypeId)
		union
		select distinct eo.id as id,
						eo.eventId as eventId,
						eo.startTime as startTime,
						eo.endTime as endTime,
						eo.allDay as allDay
				from wsa.eventOccurrence eo
			left join wsa.eventInvitee ei
				on (ei.eventId = eo.eventId)
			left join wsa_users.userRoleEntity ure
				on (ure.userId = p_userId and ure.roleId in (p_managerRoleId, p_playerRoleId) and ure.entityTypeId in (p_teamEntityTypeId, p_userEntityTypeId))
			where (eo.deleted_at is null
			  and ei.entityTypeId in (p_teamEntityTypeId, p_userEntityTypeId)
			  and ei.entityId = ure.userId);

	END IF;
END$$

DELIMITER ;
