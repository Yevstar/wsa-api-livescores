import {Controller, Param, Body, Get, QueryParam,  Req, Res, Authorized, JsonController, Post, HeaderParam} from "routing-controllers";
import {Request, Response} from 'express';
import {BaseController} from "./BaseController";
import {User} from "../models/User";
import {Event} from "../models/Event";
import {EventInvitee} from "../models/EventInvitee";
import {EventOccurrence} from "../models/EventOccurrence";
import {authToken, fileExt, isNullOrEmpty, timestamp} from "../utils/Utils";

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
    @Post('/')
    async create(
        @Body() event: Event,
        @HeaderParam("authorization") user: User,
        @Res() response: Response
    ) {
          const savedEvent = await this.eventService.createEvent(event, user.id);
          this.eventService.createEventInvitee(
              savedEvent['identifiers'][0].id,
              event['invitees'][0].entityId,
              event['invitees'][0].entityTypeId
          );

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
            return response.status(200).send({ "success" : true});
        }
}
