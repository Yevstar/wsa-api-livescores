import {Get,
    JsonController,
    QueryParam,
    Param,
    Authorized,
    Res
} from "routing-controllers";
import {BaseController} from "./BaseController";
import {Incident} from "../models/Incident";
import {Response} from "express";

@JsonController("/incident")
export class IncidentControllerController extends BaseController {

    @Authorized()
    @Get('/id/:id')
    async get(@Param("id") id: number) {
        return this.incidentService.findById(id);
    }

    @Authorized()
    @Get("/")
    async find(
        @QueryParam("incidentId") incidentId: number,
        @QueryParam("competitionId") competitionId: number,
        @Res() response: Response
    ) {
        if (incidentId || competitionId) {
            return this.incidentService.findByParams(incidentId, competitionId);
        } else {
            return response.status(200).send(
                {name: 'search_error', message: `Required parameters not filled`});
        }
    }
}
