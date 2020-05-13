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
import { isNotNullAndUndefined, paginationData, stringTONumber } from "../utils/Utils";

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
        @QueryParam("offset") offset: number,
        @QueryParam("limit") limit: number,
        @QueryParam("search") search: string,
        @Res() response: Response
    ) {
        if (incidentId || competitionId) {
            const incidentData = await this.incidentService.findByParams(incidentId, competitionId, offset, limit, search);
            if (incidentData && isNotNullAndUndefined(offset) && isNotNullAndUndefined(limit)) {
                let responseObject = paginationData(stringTONumber(incidentData.count), limit, offset)
                responseObject["incidents"] = incidentData.result;
                return responseObject;
            } else {
                return incidentData.result;
            }
        } else {
            return response.status(200).send(
                {name: 'search_error', message: `Required parameters not filled`});
        }
    }
}
