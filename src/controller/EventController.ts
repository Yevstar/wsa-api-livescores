import {Controller, Param, Body, Get, QueryParam,  Req, Res, Authorized, JsonController, Post, HeaderParam} from "routing-controllers";
import {Request, Response} from 'express';
import {BaseController} from "./BaseController";
import {User} from "../models/User";
import {Event} from "../models/Event";
import {EventInvitee} from "../models/EventInvitee";
import {EventOccurrence} from "../models/EventOccurrence";
import {authToken, fileExt, isNullOrEmpty, timestamp} from "../utils/Utils";
import {EntityType} from "../models/security/EntityType";
import * as _ from 'lodash';

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
    async findEventInvitees(
      @QueryParam("ids") ids: number[],
    ): Promise<EventInvitee[]> {
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
          const eventRecipientFunction = await this.userService.getFunction('event_recipient');

          var inviteesList = [];
          for (const index in event['invitees']) {
            if (event['invitees'][index].entityTypeId == EntityType.USER) {
              let userInvitee = new EventInvitee();
              userInvitee.eventId = savedEvent['identifiers'][0].id;
              userInvitee.entityId = event['invitees'][index].entityId;
              userInvitee.entityTypeId = event['invitees'][index].entityTypeId;
              inviteesList.push(
                userInvitee
              );
            } else if (event['invitees'][index].entityTypeId == EntityType.TEAM) {
              let userList = await this.userService.getUsersByOptions(
                  event['invitees'][index].entityTypeId,
                  event['invitees'][index].entityId,
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
                eventInviteeNotificationPromises.push(
                  this.firebaseService.sendMessage({
                      tokens: tokens,
                      data: {
                          type: 'new_event', entityTypeId: userInvitee.entityTypeId.toString(),
                          entityId: userInvitee.entityId.toString(), eventOccurrenceId: userInvitee.eventId.toString()
                        }
                  })
                );
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
        return response.status(200).send({ "success" : true});
    }
}
