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
        userId: number,
        eventReceipientsRoleIds: number[]
    ): Promise<any> {
        let result = await this.entityManager.query(
          "call wsa.usp_get_eventOccurrences(?, ?, ?, ?)",[
            userId,
            eventReceipientsRoleIds.toString(),
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
        let newEvent = new Event();
        newEvent.name = event.name;
        newEvent.location = event.location;
        newEvent.type = event.type;
        newEvent.description = event.description;
        newEvent.allDay = event.allDay;
        newEvent.startTime = event.startTime;
        newEvent.endTime = event.endTime;
        newEvent.frequency = event.frequency;
        newEvent.repeatNumber = event.repeatNumber;
        newEvent.created_by = user;
        if (!event.id) {
          newEvent.created_at = new Date();
        }
        newEvent.updated_at =  new Date();
        newEvent.venueId = event.venueId;
        newEvent.venueCourtId = event.venueCourtId;

        if (event.id) {
          newEvent.id = event.id;
          return this.createOrUpdate(newEvent);
        } else {
           return this.entityManager.insert(Event, newEvent);
         }
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

    public async deleteEvent(eventOccurrence: EventOccurrence, deleteType: string) {
        let endTime = new Date(Date.now());
        /// Setting for a particular event occurrence deleted_at
        this.entityManager
            .createQueryBuilder(EventOccurrence, 'eo')
            .update()
            .set({deleted_at: endTime})
            .where('id = :eventOccurrenceId', { eventOccurrenceId: eventOccurrence.id })
            .execute();

        if (deleteType == "EVENT") {
          this.updateDeletedAtEventAndEventInvitee(eventOccurrence, endTime);
        } else if (deleteType == "EVENT_OCCURRENCES") {
            /// From the current event occurrence passed we will set all future
            /// occurrences deleted_at
            await this.entityManager
              .createQueryBuilder(EventOccurrence, 'eo')
              .update()
              .set({deleted_at: endTime})
              .where('eventId = :eventId', { eventId: eventOccurrence.eventId })
              .andWhere('startTime > :currentEventOccurrenceTime',
                {currentEventOccurrenceTime: eventOccurrence.startTime})
              .andWhere('deleted_at is null')
              .execute();
        }

        if (deleteType != "EVENT") {
            let query = this.entityManager
                            .createQueryBuilder(EventOccurrence, 'eo')
                            .where('eventId = :eventId',
                                { eventId: eventOccurrence.eventId })
                            .andWhere('deleted_at is null');
            let result = await query.getMany();
            if (!result || result.length == 0) {
                this.updateDeletedAtEventAndEventInvitee(eventOccurrence, endTime);
            }
        }
    }

    private async updateDeletedAtEventAndEventInvitee(eventOccurrence: EventOccurrence, endTime: Date) {
        /// All event and event invitees need to set deleted_at
        this.entityManager
            .createQueryBuilder(Event, 'event')
            .update()
            .set({deleted_at: endTime})
            .where('id = :eventId', { eventId: eventOccurrence.eventId })
            .execute();

        this.entityManager
            .createQueryBuilder(EventInvitee, 'ei')
            .update()
            .set({deleted_at: endTime})
            .where('eventId = :eventId', { eventId: eventOccurrence.eventId })
            .execute();
    }

    public async fetchEventInvitees(eventId: number): Promise<EventInvitee[]> {
      let query = this.entityManager
          .createQueryBuilder(EventInvitee, 'ei')
          .where('eventId = :eventId', { eventId: eventId });
      return query.getMany();
    }

    public async fetchEventOccurrences(eventOccurrence: EventOccurrence): Promise<EventOccurrence[]> {
        let query = this.entityManager
            .createQueryBuilder(EventOccurrence, 'eo')
            .where('eventId = :eventId', { eventId: eventOccurrence.eventId })
            .andWhere('startTime >= :currentEventOccurrenceTime',
                {currentEventOccurrenceTime: eventOccurrence.startTime});
        return query.getMany();
    }

    public async deleteEventOccurrences(eventOccurrence: EventOccurrence) {
        return this.entityManager
            .createQueryBuilder(EventOccurrence, 'eo')
            .delete()
            .where('eventId = :eventId', { eventId: eventOccurrence.eventId })
            .andWhere('startTime >= :currentEventOccurrenceTime',
                {currentEventOccurrenceTime: eventOccurrence.startTime})
            .execute();
    }

    public async deleteEventInvitees(eventId: number) {
        return this.entityManager
            .createQueryBuilder(EventInvitee, 'ei')
            .delete()
            .where('eventId = :eventId', { eventId: eventId })
            .execute();
    }

    public async fetchEventOccurrenceById(id: number): Promise<EventOccurrence> {
        return this.entityManager.findOne('EventOccurrence', id);
    }
}
