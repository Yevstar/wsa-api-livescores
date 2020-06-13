import {Service} from "typedi";
import {User} from "../models/User";
import BaseService from "./BaseService";
import {Brackets} from "typeorm-plus";
import {Event} from "../models/Event";
import {EventInvitee} from "../models/EventInvitee";
import {EventOccurrence} from "../models/EventOccurrence";
import {Role} from "../models/security/Role";
import {EntityType} from "../models/security/EntityType";
import {isArrayPopulated} from "../utils/Utils";

@Service()
export default class EventService extends BaseService<Event> {

    modelName(): string {
        return Event.name;
    }

    public async findUserEventOccurrences(
        userId: number
    ): Promise<any> {
        let result = await this.entityManager.query(
          "call wsa.usp_get_eventOccurrences(?, ?, ?, ?, ?)",[
            userId,
            Role.MANAGER,
            Role.PLAYER,
            EntityType.TEAM,
            EntityType.USER
          ]);
        if (isArrayPopulated(result)) {
          return result[0];
        } else {
          return [];
        }
    }

    public async findEventsById(ids: number[]): Promise<Event[]> {
        let query = this.entityManager.createQueryBuilder(Event, 'e')
                        .leftJoinAndSelect('e.venue', 'venue')
                        .leftJoinAndSelect('e.venueCourt', 'venueCourt')
                        .andWhere('e.id in (:ids)', {ids: ids});
        return query.getMany();
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

    public async createEventOccurrence(eventId: number, allDay: boolean, startTime: Date, endTime: Date,
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

    public async createEventInvitee(eventInvitee: EventInvitee) {
        return this.entityManager.insert(EventInvitee, eventInvitee);
    }

    public async findEventInvitees(ids: number[]): Promise<any> {
        let result = await this.entityManager.query(
          "call wsa.usp_get_eventInvitees(?, ?, ?)",[
            ids.toString(),
            EntityType.TEAM,
            EntityType.USER
          ]);
        if (isArrayPopulated(result)) {
          return result[0];
        } else {
          return [];
        }
    }
}
