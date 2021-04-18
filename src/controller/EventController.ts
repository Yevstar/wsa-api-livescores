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
  Patch,
} from 'routing-controllers';
import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { User } from '../models/User';
import { Event } from '../models/Event';
import { EventInvitee } from '../models/EventInvitee';
import { EventOccurrence } from '../models/EventOccurrence';
import { authToken, fileExt, timestamp, isArrayPopulated } from '../utils/Utils';
import { EntityType } from '../models/security/EntityType';
import * as _ from 'lodash';

@JsonController('/event')
export class EventController extends BaseController {
  @Authorized()
  @Get('/id/:id')
  async get(@Param('id') id: number) {
    return this.eventService.findById(id);
  }

  @Authorized()
  @Get('/occurrences')
  async findOccurrences(@HeaderParam('authorization') user: User): Promise<EventOccurrence[]> {
    return this.eventService.findUserEventOccurrences(user.id);
  }

  @Authorized()
  @Get('/v2/occurrences')
  async findOccurrencesV2(@HeaderParam('authorization') user: User): Promise<EventOccurrence[]> {
    const eventRecipientFunction = await this.userService.getFunction('event_recipient');
    const functionRolesArray = await this.userService.getFunctionRoles(eventRecipientFunction.id);

    let eventReceipientsRoleIds = [];
    functionRolesArray.forEach(fr => {
      eventReceipientsRoleIds.push(fr.roleId);
    });

    return this.eventService.findUserEventOccurrencesV2(user.id, eventReceipientsRoleIds);
  }

  @Authorized()
  @Get('/byIds')
  async findEvents(@QueryParam('ids') ids: number[]): Promise<Event[]> {
    return this.eventService.findEventsById(ids);
  }

  @Authorized()
  @Get('/eventInvitees')
  async getEventInvitees(@QueryParam('ids') ids: number[]): Promise<any> {
    return this.eventService.findEventInvitees(ids);
  }

  @Authorized()
  @Post('/')
  async create(
    @HeaderParam('authorization') user: User,
    @Body() event: Event,
    @Res() response: Response,
  ) {
    const savedEvent = await this.eventService.createEvent(event, user.id);

    let inviteesList = [];
    let teamIdList = [];
    let userIdList = [];

    for (const index in event['invitees']) {
      if (event['invitees'][index].entityTypeId == EntityType.USER) {
        let userInvitee = new EventInvitee();
        userInvitee.eventId = savedEvent['identifiers'][0].id;
        userInvitee.entityId = event['invitees'][index].entityId;
        userInvitee.entityTypeId = EntityType.USER;

        inviteesList.push(userInvitee);

        userIdList.push(event['invitees'][index].entityId);
      } else if (event['invitees'][index].entityTypeId == EntityType.TEAM) {
        teamIdList.push(event['invitees'][index].entityId);

        let teamInvite = new EventInvitee();
        teamInvite.eventId = savedEvent['identifiers'][0].id;
        teamInvite.entityId = event['invitees'][index].entityId;
        teamInvite.entityTypeId = EntityType.TEAM;
        inviteesList.push(teamInvite);
      }
    }

    if (isArrayPopulated(teamIdList)) {
      const eventRecipientFunction = await this.userService.getFunction('event_recipient');

      let userList = await this.userService.getUsersByOptions(EntityType.TEAM, teamIdList, '', {
        functionId: eventRecipientFunction.id,
      });
      if (userList) {
        userList.forEach(teamUser => {
          if (teamUser.id != user.id) {
            _.remove(inviteesList, function (invitee) {
              return invitee.entityId == teamUser.id && invitee.entityTypeId == EntityType.USER;
            });
            userIdList.push(teamUser.id);
          }
        });
      }
    }

    const eventInviteePromises = [];

    if (inviteesList.length > 0) {
      inviteesList.forEach(async userInvitee => {
        eventInviteePromises.push(this.eventService.createEventInvitee(userInvitee));
      });
    }
    await Promise.all(eventInviteePromises);

    if (
      event.frequency.toLowerCase() === Event.WEEKLY.toLowerCase() ||
      event.frequency.toLowerCase() === Event.DAILY.toLowerCase()
    ) {
      const dateIncrementBy = event.frequency.toLowerCase() === Event.WEEKLY ? 7 : 1;
      const promises = [];

      for (let i = 0; i < event.repeatNumber; i++) {
        let startTime = new Date(event.startTime);
        startTime.setDate(startTime.getDate() + i * dateIncrementBy);
        let endTime = new Date(event.endTime);
        endTime.setDate(endTime.getDate() + i * dateIncrementBy);

        promises.push(
          this.eventService.createEventOccurrence(
            savedEvent['identifiers'][0].id,
            event.allDay,
            startTime,
            endTime,
            user.id,
          ),
        );
      }
      await Promise.all(promises);
    } else {
      await this.eventService.createEventOccurrence(
        savedEvent['identifiers'][0].id,
        event.allDay,
        event.startTime,
        event.endTime,
        user.id,
      );
    }

    this.notifyEventToUsers(savedEvent['identifiers'][0].id, 'new_event', userIdList, user);
    return response.status(200).send({ success: true });
  }

  @Authorized()
  @Patch('/update')
  async updateEvent(
    @HeaderParam('authorization') user: User,
    @QueryParam('eventOccurrenceId', { required: true }) eventOccurrenceId: number,
    @QueryParam('createdBy', { required: true }) createdBy: number,
    @Body() event: Event,
    @Res() response: Response,
  ) {
    const eventOccurrence = await this.eventService.fetchEventOccurrenceById(eventOccurrenceId);
    const prevEventInvitees = await this.eventService.fetchEventInvitees(event.id);

    /// 1. Saved the event coming
    const savedEvent = await this.eventService.createEvent(event, createdBy);
    /// 2. Removing event occurrences, event invitees and event occurrence rosters if any
    const deletePromises = [];
    deletePromises.push(this.eventService.deleteEventOccurrences(eventOccurrence));
    deletePromises.push(this.eventService.deleteEventInvitees(event.id));
    deletePromises.push(
      this.deleteEventOccurrenceRoster('EVENT_OCCURRENCES', eventOccurrence, user),
    );
    await Promise.all(deletePromises);
    /// 3. Getting the new invitees list from the event
    let inviteesList = [];
    let teamIdList = [];
    let userIdList = [];

    for (const index in event['invitees']) {
      if (event['invitees'][index].entityTypeId == EntityType.USER) {
        let userInvitee = new EventInvitee();
        userInvitee.eventId = event.id;
        userInvitee.entityId = event['invitees'][index].entityId;
        userInvitee.entityTypeId = EntityType.USER;
        inviteesList.push(userInvitee);

        userIdList.push(event['invitees'][index].entityId);
      } else if (event['invitees'][index].entityTypeId == EntityType.TEAM) {
        teamIdList.push(event['invitees'][index].entityId);

        let teamInvite = new EventInvitee();
        teamInvite.eventId = event.id;
        teamInvite.entityId = event['invitees'][index].entityId;
        teamInvite.entityTypeId = EntityType.TEAM;
        inviteesList.push(teamInvite);
      }
    }

    if (isArrayPopulated(teamIdList)) {
      const eventRecipientFunction = await this.userService.getFunction('event_recipient');

      let userList = await this.userService.getUsersByOptions(EntityType.TEAM, teamIdList, '', {
        functionId: eventRecipientFunction.id,
      });
      if (userList) {
        userList.forEach(teamUser => {
          if (teamUser.id != createdBy) {
            _.remove(inviteesList, function (invitee) {
              return invitee.entityId == teamUser.id && invitee.entityTypeId == EntityType.USER;
            });
            userIdList.push(teamUser.id);
          }
        });
      }
    }
    /// 4. Create promises for creation of event invitee and respective
    ///    notifications to update the users.
    const eventInviteePromises = [];

    if (inviteesList.length > 0) {
      inviteesList.forEach(async userInvitee => {
        eventInviteePromises.push(this.eventService.createEventInvitee(userInvitee));
      });
    }
    await Promise.all(eventInviteePromises);

    if (
      event.frequency.toLowerCase() === Event.WEEKLY.toLowerCase() ||
      event.frequency.toLowerCase() === Event.DAILY.toLowerCase()
    ) {
      let currentTime = new Date(Date.now());

      const dateIncrementBy = event.frequency.toLowerCase() === Event.WEEKLY ? 7 : 1;
      const promises = [];

      for (let i = 0; i < event.repeatNumber; i++) {
        let startTime;
        if (event.startTime < currentTime) {
          startTime = currentTime;
        } else {
          startTime = new Date(event.startTime);
        }
        startTime.setDate(startTime.getDate() + i * dateIncrementBy);
        let endTime = new Date(event.endTime);
        endTime.setDate(endTime.getDate() + i * dateIncrementBy);

        promises.push(
          this.eventService.createEventOccurrence(
            event.id,
            event.allDay,
            startTime,
            endTime,
            createdBy,
          ),
        );
      }
      await Promise.all(promises);
    } else {
      await this.eventService.createEventOccurrence(
        event.id,
        event.allDay,
        event.startTime,
        event.endTime,
        createdBy,
      );
    }

    if (createdBy != user.id && userIdList.indexOf(createdBy) < 0) {
      userIdList.push(createdBy);
    }
    this.notifyEventToUsers(event.id, 'event_updated', userIdList, user);

    /// 5. Send event removed for any missing previous event invitees
    this.notifyRemovedUsers(event.id, inviteesList, userIdList, prevEventInvitees, user);

    return response.status(200).send({ success: true });
  }

  private async notifyRemovedUsers(
    eventId: number,
    currentEventInvitees: EventInvitee[],
    userIdsNeedNotNotify: number[],
    prevEventInvitees: EventInvitee[],
    updatedBy: User,
  ) {
    let deletedEventInvitees = [];
    /// Get all invitees who are not there in the current invitee list
    for (let prevInvitee of prevEventInvitees) {
      if (
        !currentEventInvitees.some(
          ei => ei.entityTypeId == prevInvitee.entityTypeId && ei.entityId == prevInvitee.entityId,
        )
      ) {
        deletedEventInvitees.push(prevInvitee);
      }
    }

    if (isArrayPopulated(deletedEventInvitees)) {
      this.sendEventRemovedNotification(
        eventId,
        deletedEventInvitees,
        updatedBy,
        userIdsNeedNotNotify,
      );
    }
  }

  @Authorized()
  @Delete('/deleteEvent')
  async deleteEvent(
    @HeaderParam('authorization') user: User,
    @QueryParam('deleteType', { required: true })
    deleteType: 'EVENT' | 'SINGLE_EVENT_OCCURRENCE' | 'EVENT_OCCURRENCES',
    @Body() eventOccurrence: EventOccurrence,
    @Res() response: Response,
  ) {
    await this.eventService.deleteEvent(eventOccurrence, deleteType);
    await this.deleteEventOccurrenceRoster(deleteType, eventOccurrence, user);
    let eventInvitees = await this.eventService.fetchEventInvitees(eventOccurrence.eventId);
    this.sendEventRemovedNotification(eventOccurrence.eventId, eventInvitees, user);

    return response.status(200).send({ success: true });
  }

  private async deleteEventOccurrenceRoster(
    deleteType: string,
    eventOccurrence: EventOccurrence,
    user: User,
  ) {
    if (deleteType == 'EVENT_OCCURRENCES') {
      let eventOccurrences = await this.eventService.fetchEventOccurrences(eventOccurrence);
      if (eventOccurrences && eventOccurrences.length > 0) {
        let eventOccurrenceIdsArray = eventOccurrences.map(eo => eo.id);
        await this.rosterService.deleteByEventOccurrenceIds(eventOccurrenceIdsArray);
      }
    } else {
      await this.rosterService.deleteByEventOccurrence(eventOccurrence.id);
    }
  }

  private async notifyEventToUsers(
    eventId: number,
    notifyType: string,
    userIdList: number[],
    updatedBy: User,
  ) {
    let tokens = (await this.deviceService.getUserTokens(userIdList)).map(
      device => device.deviceId,
    );
    if (tokens && tokens.length > 0) {
      let uniqTokens = new Set(tokens);
      this.firebaseService.sendMessageChunked({
        tokens: Array.from(uniqTokens),
        data: {
          type: notifyType,
          eventId: eventId.toString(),
          userId: updatedBy.id.toString(),
        },
      });
    }
  }

  private async sendEventRemovedNotification(
    eventId: number,
    eventInvitees: EventInvitee[],
    updatedBy: User,
    userIdsNeedNotNotify: number[] = undefined,
  ) {
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
      let userList = await this.userService.getUsersByOptions(EntityType.TEAM, teamIdList, '', {
        functionId: eventRecipientFunction.id,
      });
      userList.forEach(user => {
        userIdList.push(user.id);
      });
    }

    /// Getting all the tokens and then will send notification to only
    /// Uniq token set
    if (isArrayPopulated(userIdsNeedNotNotify)) {
      _.remove(userIdList, function (userId) {
        return userIdsNeedNotNotify.indexOf(userId) >= 0;
      });
    }

    let tokens = (await this.deviceService.getUserTokens(userIdList)).map(
      device => device.deviceId,
    );

    if (isArrayPopulated(tokens)) {
      let uniqTokens = new Set(tokens);
      this.firebaseService.sendMessageChunked({
        tokens: Array.from(uniqTokens),
        data: {
          type: 'event_occurrence_removed',
          eventId: eventId.toString(),
          userId: updatedBy.id.toString(),
        },
      });
    }
  }
}
