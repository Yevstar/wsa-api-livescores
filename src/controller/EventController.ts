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
    async find(
        @HeaderParam("authorization") user: User,
    ): Promise<EventOccurrence[]> {
        return this.eventService.findByParams(user.id);
    }

    @Authorized()
    @Post('/')
    async create(
        @Body() event: Event,
        @HeaderParam("authorization") user: User,
        @Res() response: Response)
        {
            if (event.frequency === 'Weekly')
            {
                var eventID = await this.eventService.createEvent(event, user.id);
                for (let i = 0; i < event.repeatNumber; i++)
                {
                    var startTime = new Date(event.startTime);
                    startTime.setDate(startTime.getDate() + event.repeatNumber * 7);
                    var endTime = new Date(event.endTime);
                    endTime.setDate(endTime.getDate() + event.repeatNumber * 7);
                    await this.eventService.creatEventOccurrence(eventID['identifiers'][0].id , event.allDay , startTime, endTime, user.id);
                }
                await this.eventService.creatEventInvitee(eventID['identifiers'][0].id ,event['invitees'][0].entityId, event['invitees'][0].entityTypeId);
            }
            else if (event.frequency === 'Daily')
            {
                var eventID = await this.eventService.createEvent(event, user.id);
                for (let i = 0; i < event.repeatNumber; i++)
                {
                    var startTime = new Date(event.startTime);
                    startTime.setDate(startTime.getDate() + event.repeatNumber);
                    var endTime = new Date(event.endTime);
                    endTime.setDate(endTime.getDate() + event.repeatNumber);

                    await this.eventService.creatEventOccurrence(eventID['identifiers'][0].id, event.allDay , startTime, endTime, user.id);
                }
                await this.eventService.creatEventInvitee(eventID['identifiers'][0].id ,event['invitees'][0].entityId, event['invitees'][0].entityTypeId);
            }
            else
            {
                var eventID = await this.eventService.createEvent(event, user.id);
                await this.eventService.creatEventOccurrence(eventID['identifiers'][0].id, event.allDay , event.startTime, event.endTime, user.id);
                await this.eventService.creatEventInvitee(eventID['identifiers'][0].id ,event['invitees'][0].entityId, event['invitees'][0].entityTypeId);
            }
            return response.status(200).send({ "success" : true});
        }
}
