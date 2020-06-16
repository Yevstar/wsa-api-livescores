import {
    Controller,
    Param,
    Body,
    Get,
    QueryParam,
    Req,
    Res,
    Authorized,
    JsonController,
    Post,
    HeaderParam,
    Delete,
    Patch
} from "routing-controllers";
import {Request, Response} from 'express';
import {BaseController} from "./BaseController";
import {User} from "../models/User";
import {Event} from "../models/Event";
import {EventInvitee} from "../models/EventInvitee";
import {EventOccurrence} from "../models/EventOccurrence";
import {authToken, fileExt, timestamp} from "../utils/Utils";
import {EntityType} from "../models/security/EntityType";
import * as _ from 'lodash';
import { isArrayPopulated } from "../utils/Utils";

@JsonController('/event')
export class EventController  extends BaseController {
    @Authorized()
    @Get('/id/:id')
    async get(@Param("id") id: number) {
        return this.eventService.findById(id);
    }

    @Authorized()
    @Get("/occurrences")
    async findOccurrences(
        @HeaderParam("authorization") user: User,
    ): Promise<EventOccurrence[]> {
        return this.eventService.findUserEventOccurrences(user.id);
    }

    @Authorized()
    @Get("/byIds")
    async findEvents(
      @QueryParam("ids") ids: number[],
    ): Promise<Event[]> {
      return this.eventService.findEventsById(ids);
    }

    @Authorized()
    @Get("/eventInvitees")
    async getEventInvitees(
      @QueryParam("ids") ids: number[],
    ): Promise<any> {
      return this.eventService.findEventInvitees(ids);
    }

    @Authorized()
    @Post('/')
    async create(
        @HeaderParam("authorization") user: User,
        @Body() event: Event,
        @Res() response: Response
    ) {
          const savedEvent = await this.eventService.createEvent(event, user.id);

          let inviteesList = [];
          let teamIdList = [];
          for (const index in event['invitees']) {
              if (event['invitees'][index].entityTypeId == EntityType.USER) {
                  let userInvitee = new EventInvitee();
                  userInvitee.eventId = savedEvent['identifiers'][0].id;
                  userInvitee.entityId = event['invitees'][index].entityId;
                  userInvitee.entityTypeId = EntityType.USER;
                  inviteesList.push(
                      userInvitee
                  );
              } else if (event['invitees'][index].entityTypeId == EntityType.TEAM) {
                  teamIdList.push(event['invitees'][index].entityId);
              }
          }

          if (isArrayPopulated(teamIdList)) {
              const eventRecipientFunction = await this.userService.getFunction('event_recipient');

              let userList = await this.userService.getUsersByOptions(
                EntityType.TEAM,
                teamIdList,
                '',
                {functionId: eventRecipientFunction.id}
              );
              if (userList) {
                  userList.forEach(teamUser => {
                      if (teamUser.id != user.id) {
                          let userInvitee = new EventInvitee();
                          userInvitee.eventId = savedEvent['identifiers'][0].id;
                          userInvitee.entityId = teamUser.id;
                          userInvitee.entityTypeId = EntityType.USER;
                          inviteesList.push(
                              userInvitee
                          );
                      }
                  });
              }
          }

          const eventInviteePromises = [];
          const eventInviteeNotificationPromises = [];

          if (inviteesList.length > 0) {
              let uniqueInviteesList = _.uniqBy(inviteesList, invitee => invitee.entityId);

              uniqueInviteesList.forEach(async userInvitee => {
                eventInviteePromises.push(
                  this.eventService.createEventInvitee(
                    userInvitee
                  )
                );
                let tokens = (await this.deviceService.getUserDevices(userInvitee.entityId)).map(device => device.deviceId);
                if (tokens && tokens.length > 0) {
                    eventInviteeNotificationPromises.push(
                        this.firebaseService.sendMessage({
                            tokens: tokens,
                            data: {
                                type: 'new_event', entityTypeId: userInvitee.entityTypeId.toString(),
                                entityId: userInvitee.entityId.toString(), eventId: userInvitee.eventId.toString()
                            }
                        })
                    );
                }
              });
          }
          await Promise.all(eventInviteePromises);

          if (event.frequency.toLowerCase() === Event.WEEKLY.toLowerCase() ||
              event.frequency.toLowerCase() === Event.DAILY.toLowerCase()) {
                const dateIncrementBy =
                    event.frequency.toLowerCase() === Event.WEEKLY ? 7 : 1;
                const promises = [];

                for (let i = 0; i < event.repeatNumber; i++) {
                    let startTime = new Date(event.startTime);
                    startTime.setDate(startTime.getDate() + (i * dateIncrementBy));
                    let endTime = new Date(event.endTime);
                    endTime.setDate(endTime.getDate() + (i * dateIncrementBy));

                    promises.push(
                      this.eventService.createEventOccurrence(
                        savedEvent['identifiers'][0].id ,
                        event.allDay ,
                        startTime,
                        endTime,
                        user.id
                      )
                    );
                }
                await Promise.all(promises);
        } else {
            await this.eventService.createEventOccurrence(
                savedEvent['identifiers'][0].id,
                event.allDay ,
                event.startTime,
                event.endTime,
                user.id
            );
        }

        await Promise.all(eventInviteeNotificationPromises);
        return response.status(200).send({ "success" : true });
    }

    @Authorized()
    @Patch('/update')
    async updateEvent(
        @HeaderParam("authorization") user: User,
        @QueryParam('eventOccurrenceId', {required: true}) eventOccurrenceId: number,
        @Body() event: Event,
        @Res() response: Response
    ) {
          const eventOccurrence = await this.eventService.fetchEventOccurrenceById(eventOccurrenceId);
          const prevEventInvitees = await this.eventService.fetchEventInvitees(event.id);

          /// 1. Saved the event coming
          const savedEvent = await this.eventService.createEvent(event, user.id);
          /// 2. Removing event occurrences, event invitees and event occurrence rosters if any
          const deletePromises = [];
          deletePromises.push(
            this.eventService.deleteEventOccurrences(eventOccurrence)
          );
          deletePromises.push(
            this.eventService.deleteEventInvitees(event.id)
          );
          deletePromises.push(
            this.deleteEventOccurrenceRoster('EVENT_OCCURRENCES', eventOccurrence)
          );
          await Promise.all(deletePromises);
          /// 3. Getting the new invitees list from the event
          let inviteesList = [];
          let uniqueInviteesList = [];
          let teamIdList = [];
          for (const index in event['invitees']) {
              if (event['invitees'][index].entityTypeId == EntityType.USER) {
                  let userInvitee = new EventInvitee();
                  userInvitee.eventId = event.id;
                  userInvitee.entityId = event['invitees'][index].entityId;
                  userInvitee.entityTypeId = EntityType.USER;
                  inviteesList.push(
                      userInvitee
                  );
              } else if (event['invitees'][index].entityTypeId == EntityType.TEAM) {
                  teamIdList.push(event['invitees'][index].entityId);
              }
          }

          if (isArrayPopulated(teamIdList)) {
              const eventRecipientFunction = await this.userService.getFunction('event_recipient');

              let userList = await this.userService.getUsersByOptions(
                EntityType.TEAM,
                teamIdList,
                '',
                {functionId: eventRecipientFunction.id}
              );
              if (userList) {
                  userList.forEach(teamUser => {
                      if (teamUser.id != user.id) {
                          let userInvitee = new EventInvitee();
                          userInvitee.eventId = event.id;
                          userInvitee.entityId = teamUser.id;
                          userInvitee.entityTypeId = EntityType.USER;
                          inviteesList.push(
                              userInvitee
                          );
                      }
                  });
              }
          }
          /// 4. Create promises for creation of event invitee and respective
          ///    notifications to update the users.
          const eventInviteePromises = [];
          const eventInviteeNotificationPromises = [];

          if (inviteesList.length > 0) {
              Array.prototype.push.apply(
                  uniqueInviteesList,
                  _.uniqBy(inviteesList, invitee => invitee.entityId)
              );
              uniqueInviteesList.forEach(async userInvitee => {
                eventInviteePromises.push(
                  this.eventService.createEventInvitee(
                    userInvitee
                  )
                );
                let tokens = (await this.deviceService.getUserDevices(userInvitee.entityId)).map(device => device.deviceId);
                if (tokens && tokens.length > 0) {
                    eventInviteeNotificationPromises.push(
                        this.firebaseService.sendMessage({
                            tokens: tokens,
                            data: {
                                type: 'event_updated', entityTypeId: userInvitee.entityTypeId.toString(),
                                entityId: userInvitee.entityId.toString(), eventId: userInvitee.eventId.toString()
                            }
                        })
                    );
                }
              });
          }
          await Promise.all(eventInviteePromises);

          if (event.frequency.toLowerCase() === Event.WEEKLY.toLowerCase() ||
              event.frequency.toLowerCase() === Event.DAILY.toLowerCase()) {
                let currentTime = new Date(Date.now());

                const dateIncrementBy =
                    event.frequency.toLowerCase() === Event.WEEKLY ? 7 : 1;
                const promises = [];

                for (let i = 0; i < event.repeatNumber; i++) {
                    let startTime;
                    if (event.startTime < currentTime) {
                        startTime = currentTime;
                    } else {
                        startTime = new Date(event.startTime);
                    }
                    startTime.setDate(startTime.getDate() + (i * dateIncrementBy));
                    let endTime = new Date(event.endTime);
                    endTime.setDate(endTime.getDate() + (i * dateIncrementBy));

                    promises.push(
                      this.eventService.createEventOccurrence(
                        event.id,
                        event.allDay,
                        startTime,
                        endTime,
                        user.id
                      )
                    );
                }
                await Promise.all(promises);
        } else {
            await this.eventService.createEventOccurrence(
                event.id,
                event.allDay ,
                event.startTime,
                event.endTime,
                user.id
            );
        }

        Promise.all(eventInviteeNotificationPromises);
        /// 5. Send event removed for any missing previous event invitees
        this.notifyRemovedUsers(uniqueInviteesList, prevEventInvitees);

        return response.status(200).send({ "success" : true });
    }

    private async notifyRemovedUsers(
        currentEventInvitees: EventInvitee[],
        prevEventInvitees: EventInvitee[]
    ) {
        let deletedEventInvitees = [];
        /// Get all invitees who are not there in the current invitee list
        for (let prevInvitee of prevEventInvitees) {
            if (!currentEventInvitees.some(ei =>
                (ei.entityTypeId == prevInvitee.entityTypeId &&
                  ei.entityId == prevInvitee.entityId))) {
                      deletedEventInvitees.push(prevInvitee);
            }
        }

        if (isArrayPopulated(deletedEventInvitees)) {
            this.sendEventRemovedNotification(deletedEventInvitees);
        }
    }

    @Authorized()
    @Delete('/deleteEvent')
    async deleteEvent(
      @QueryParam('deleteType', {required: true}) deleteType: "EVENT" | "SINGLE_EVENT_OCCURRENCE" | "EVENT_OCCURRENCES",
      @Body() eventOccurrence: EventOccurrence,
      @Res() response: Response
    ) {
        await this.eventService.deleteEvent(eventOccurrence, deleteType);
        await this.deleteEventOccurrenceRoster(deleteType, eventOccurrence);
        let eventInvitees = await this.eventService.fetchEventInvitees(eventOccurrence.eventId);
        this.sendEventRemovedNotification(eventInvitees);

        return response.status(200).send({ "success" : true});
    }

    private async deleteEventOccurrenceRoster(deleteType: string, eventOccurrence: EventOccurrence) {
        let rosters = [];
        if (deleteType == "EVENT_OCCURRENCES") {
            let eventOccurrences = await this.eventService.fetchEventOccurrences(eventOccurrence);
            if (eventOccurrences && eventOccurrences.length > 0) {
                let eventOccurrenceIdsArray = eventOccurrences.map(eo => eo.id);
                let eventOccurrenceRosters = await this.rosterService.findByEventOccurrenceIds(eventOccurrenceIdsArray);
                Array.prototype.push.apply(rosters, eventOccurrenceRosters);
                await this.rosterService.deleteByEventOccurrenceIds(eventOccurrenceIdsArray);
            }
        } else {
            let eventOccurrenceRosters = await this.rosterService.findByEventOccurrence(eventOccurrence.id);
            Array.prototype.push.apply(rosters, eventOccurrenceRosters);
            await this.rosterService.deleteByEventOccurrence(eventOccurrence.id);
        }
    }

    private async sendEventRemovedNotification(eventInvitees: EventInvitee[]) {
        let userIdList = [];
        let teamIdList = [];
        eventInvitees.forEach(ei => {
            if (ei.entityTypeId == EntityType.TEAM) {
                teamIdList.push(ei.entityId);
            } else {
                userIdList.push(ei.entityId);
            }
        });
        if (isArrayPopulated(teamIdList)) {
            const eventRecipientFunction = await this.userService.getFunction('event_recipient');
            let userList = await this.userService.getUsersByOptions(
                EntityType.TEAM,
                teamIdList,
                '',
                {functionId: eventRecipientFunction.id}
            );
            userList.forEach(user => {
                userIdList.push(user.id);
            });
        }

        /// Getting all the tokens and then will send notification to only
        /// Uniq token set
        let tokens = [];
        for (let userId of userIdList) {
            let userTokens = (await this.deviceService.getUserDevices(userId)).map(device => device.deviceId);
            if (userTokens && userTokens.length > 0) {
                Array.prototype.push.apply(tokens, userTokens);
            }
        }

        if (isArrayPopulated(tokens)) {
            let uniqTokens = new Set(tokens);
            this.firebaseService.sendMessage({
                tokens: Array.from(uniqTokens),
                data: {
                    type: 'event_occurrence_removed'
                }
            });
        }
    }
}
