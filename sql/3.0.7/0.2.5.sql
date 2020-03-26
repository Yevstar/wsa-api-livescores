DROP PROCEDURE IF EXISTS `wsa`.`usp_get_eventOccurrences` ;

DELIMITER $$

CREATE  PROCEDURE `wsa`.`usp_get_eventOccurrences`(
	p_userId int,
    p_userEntityTypeId int,
	p_roleIds VARCHAR(255),
	p_entityTypeIds VARCHAR(255)
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
			on (ure.userId = p_userId)
		left join wsa_users.linked_entities le
			on (le.linkedEntityId = ure.entityId and le.linkedEntityTypeId = ure.entityTypeId)
		where (eo.deleted_at is null)
			and (ure.roleId in (p_roleIds) and ure.entityTypeId in (p_entityTypeIds))
            and (ei.entityTypeId = p_userEntityTypeId or
					le.inputEntityId = ei.entityId and le.inputEntityTypeId = ei.entityTypeId);
	END IF;
END$$

DELIMITER ;
