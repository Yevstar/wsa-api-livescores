import {Service} from "typedi";
import {User} from "../models/User";
import BaseService from "./BaseService";
import {Brackets} from "typeorm-plus";
import {Event} from "../models/Event";
import {EventInvitee} from "../models/EventInvitee";
import {EventOccurrence} from "../models/EventOccurrence";

@Service()
export default class EventService extends BaseService<Event> {

    modelName(): string {
        return Event.name;
    }

    public async findByParams(
        entityId: number
    ): Promise<EventOccurrence[]> {
        let query = this.entityManager
            .createQueryBuilder(EventOccurrence, "eo")
            .select('distinct eo.*')
            .where("eo.eventId in (:entityId)", {
                entityId
            });
        return query.getRawMany();
    }

    public async createEvent(event, user) {
        let me = new Event();
        me.name = event.name;
        me.location = event.location;
        me.type = event.type;
        me.description = event.description;
        me.allDay = event.allDay;
        me.startTime = event.startTime;
        me.endTime = event.endTime;
        me.frequency = event.frequency;
        me.repeatNumber = event.repeatNumber;
        me.created_by = user;
        me.created_at = new Date();
        me.updated_at =  new Date();
        me.venueId = event.venueId;
        me.venueCourtId = event.venueCourtId;
        return this.entityManager.insert(Event, me);
    }

    public async creatEventOccurrence(eventId: number, allDay: boolean, startTime: Date, endTime: Date,
                                                created_by: number) {
        let me = new EventOccurrence();
        me.eventId = eventId;
        me.allDay = allDay;
        me.startTime = startTime;
        me.endTime = endTime;
        me.created_by = created_by;
        me.created_at = new Date();
        return this.entityManager.insert(EventOccurrence, me);
    }

    public async creatEventInvitee(eventId: number, entityId: number, entityTypeId: number ) {
        let me = new EventInvitee();
        me.eventId = eventId;
        me.entityId = entityId;
        me.entityTypeId = entityTypeId;

        return this.entityManager.insert(EventInvitee, me);
    }

}
