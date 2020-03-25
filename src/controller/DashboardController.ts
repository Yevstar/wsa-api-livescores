import { Get, JsonController, QueryParam, Authorized, Res } from "routing-controllers";
import { BaseController } from "./BaseController";
import { Response } from "express";

@JsonController("/dashboard")
export class IncidentControllerController extends BaseController {

    @Authorized()
    @Get("/newsIncidentMatch")
    async getNewsMatchIncidentInDashboard(
        @QueryParam("competitionId") competitionId: number,
        @Res() response: Response) {
        if (competitionId) {
            const responseObject = Object.assign({});
            const today = new Date();
            const yesterday = (d => new Date(d.setDate(d.getDate() - 1)))(new Date);
            responseObject.incident = await this.incidentService.getIncidentsForDashBoard(competitionId, yesterday, today);
            responseObject.news = await this.newsService.findNewsByEntityId(competitionId);
            responseObject.match = await this.matchService.findByParam(yesterday, today, null, null, competitionId, null, null, null, null, null);
            responseObject.match = responseObject.match.result;
            return responseObject;
        } else {
            return response.status(200).send({ name: 'search_error', message: `Required parameters not filled` });
        }
    }
}
