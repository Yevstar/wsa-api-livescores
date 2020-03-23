ALTER TABLE wsa.match CHANGE `venueId` `venueCourtId ` int(11);

DROP VIEW IF EXISTS wsa.parentVenue;

create function wsa_common.getEventSpecificVenue() returns BOOL DETERMINISTIC NO SQL return @getEventSpecificVenue;

create or replace view wsa_common.parentVenue as
(select court.id venueCourtId, venue.id venueId, venue.name venueName, court.name venueCourtName,
concat(venue.name, ", ", court.name) as longName, court.lng
from wsa_common.venueCourt court, wsa_common.venue venue
where court.venueId = venue.id)
union
(select null, venue.id venueId, venue.name venueName, null,
venue.name longName, venue.lng
from wsa_common.venue venue
where venue.isEventSpecific = 1 AND wsa_common.getEventSpecificVenue() = 1);

ALTER TABLE wsa.event CHANGE `locationId` `venueId` int(11);

ALTER TABLE wsa.event ADD COlUMN venueCourtId int(11) DEFAULT NULL;
