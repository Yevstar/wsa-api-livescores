import { Get, JsonController, QueryParam, Authorized, Res } from "routing-controllers";
import { BaseController } from "./BaseController";
import { Response } from "express";
import { Match } from "../models/Match";
import { isArrayPopulated } from "../utils/Utils";

@JsonController("/dashboard")
export class DashboardController extends BaseController {

    @Authorized()
    @Get("/newsIncidentMatch")
    async getNewsMatchIncidentInDashboard(
        @QueryParam("competitionId") competitionId: number,
        @QueryParam("startDay") startDayTime: Date,
        @QueryParam("currentTime") currentDayTime: Date,
        @Res() response: Response) {
        if (competitionId) {
            const responseObject = Object.assign({});

            if (startDayTime) {
                const currentDateForMatches = new Date(startDayTime);

                const match_day = currentDateForMatches.getDate();
                const match_month = currentDateForMatches.getMonth();
                const match_year = currentDateForMatches.getFullYear();
                const match_hours = currentDateForMatches.getHours();
                const match_minutes = currentDateForMatches.getMinutes();
                const match_seconds = currentDateForMatches.getSeconds();

                const todayMidnightStart = new Date(match_year, match_month, match_day, match_hours, match_minutes, match_seconds);

                responseObject.match = await this.matchService.findTodaysMatchByParam(todayMidnightStart, todayMidnightStart, null, null, competitionId, null, null, null);
                responseObject.match = await this.getPlayerAttendanceTeamAndRosterByMatch(responseObject.match.result);
            }

            if (currentDayTime) {
                const currentTimeForNews = new Date(currentDayTime);

                const news_day = currentTimeForNews.getDate();
                const news_month = currentTimeForNews.getMonth();
                const news_year = currentTimeForNews.getFullYear();
                const news_hours = currentTimeForNews.getHours();
                const news_minutes = currentTimeForNews.getMinutes();
                const news_seconds = currentTimeForNews.getSeconds();

                const userCurrentTimeForNews = new Date(news_year, news_month, news_day, news_hours, news_minutes, news_seconds);
                responseObject.news = await this.newsService.findTodaysNewsByEntityId(competitionId, userCurrentTimeForNews);
            }

            const today = new Date();
            const yesterday = (d => new Date(d.setDate(d.getDate() - 1)))(new Date);
            responseObject.incident = await this.incidentService.getIncidentsForDashBoard(competitionId, yesterday, today);
            return responseObject;
        } else {
            return response.status(200).send({ name: 'search_error', message: `Required parameters not filled` });
        }
    }

    async getPlayerAttendanceTeamAndRosterByMatch(matchArray: Match[]) {
        if (isArrayPopulated(matchArray)) {
            let promises = matchArray.map(element => {
                return this.getRosterAndTeamAttendance(element.id, element.team1Id, element.team2Id)
                    .then((each: any) => {
                        if (each !== null) {
                            element['scorer1Status'] = each.scorer1Status;
                            element['scorer2Status'] = each.scorer2Status;
                            element['teamAttendanceCountA'] = each.teamAttendanceCountA;
                            element['teamAttendanceCountB'] = each.teamAttendanceCountB;
                        }
                        return element;
                    }).catch(err => console.log('err  :::: ', err));
            });
            return await Promise.all(promises)
        }
    }

    async getRosterAndTeamAttendance(matchId: number, team1Id: number, team2Id: number): Promise<any> {
        const scorerId = 4;
        let scorer1Status = await this.rosterService.getRosterStatus(scorerId, team1Id, matchId);
        let scorer2Status = await this.rosterService.getRosterStatus(scorerId, team2Id, matchId);
        let teamAttendanceCountA = await this.gameTimeAttendanceService.getPlayerAttendanceCount(team1Id, matchId);
        let teamAttendanceCountB = await this.gameTimeAttendanceService.getPlayerAttendanceCount(team2Id, matchId);
        return new Promise((resolve, reject) => {
            if (scorer1Status || scorer2Status || teamAttendanceCountA || teamAttendanceCountB) {
                resolve({ scorer1Status, scorer2Status, teamAttendanceCountA, teamAttendanceCountB });
            } else {
                reject(null);
            }
        });
    }
}
