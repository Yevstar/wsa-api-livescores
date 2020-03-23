create view parentVenue as
select court.id, parent.name parentName, court.name name, concat(parent.name, ", ", court.name) as longName, court.longitude from venue court, venue parent
where court.parentId = parent.id
