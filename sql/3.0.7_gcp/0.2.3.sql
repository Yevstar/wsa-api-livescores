DROP PROCEDURE IF EXISTS `wsa`.`usp_get_news` ;

DELIMITER $$

CREATE  PROCEDURE `wsa`.`usp_get_news`(
	p_userId int,
	p_deviceId varchar(255)
)
BEGIN
	IF(p_userId IS NOT NULL) THEN
		select distinct nw.*
			from wsa.news nw
		left join wsa.linked_entities le
			on (nw.entityId = le.inputEntityId and nw.entityTypeId = le.inputEntityTypeId)
		left join wsa.watchlist wl
			on (le.linkedEntityId = wl.entityId and le.linkedEntityTypeId = wl.entityTypeId)
		left join userRoleEntity ure
			on (le.linkedEntityId = ure.entityId and le.linkedEntityTypeId = ure.entityTypeId)
		where (wl.userId = p_userId or ure.userId = p_userId)
			and nw.deleted_at is null
			and nw.isActive = 1
			and (nw.news_expire_date  is null or nw.news_expire_date > now())
			and toUserIds is null and toUserRoleIds is null and toRosterRoleIds is null
		order by nw.updated_at desc;
	ELSEIF(p_deviceId IS NOT NULL) THEN
		select distinct nw.*
			from wsa.news nw
		left join wsa.linked_entities le
			on (nw.entityId = le.inputEntityId and nw.entityTypeId = le.inputEntityTypeId)
		left join wsa.watchlist wl
		    on (le.linkedEntityId = wl.entityId and le.linkedEntityTypeId = wl.entityTypeId)
	  	where wl.deviceId = p_deviceId
			and nw.deleted_at is null
			and nw.isActive = 1
			and (nw.news_expire_date  is null or nw.news_expire_date > now())
			and toUserIds is null and toUserRoleIds is null and toRosterRoleIds is null
		order by nw.updated_at desc;
	END IF;
END$$

DELIMITER ;
