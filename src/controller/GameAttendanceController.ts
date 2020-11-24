import {
    Authorized,
    Body,
    Delete,
    Get,
    HeaderParam,
    JsonController,
    Param,
    Patch,
    Post,
    QueryParam,
    Res
} from 'routing-controllers';
import {GameTimeAttendance} from "../models/GameTimeAttendance";
import {Response} from "express";
import {BaseController} from "./BaseController";
import {User} from "../models/User";
import {Match} from "../models/Match";
import {Lineup} from "../models/Lineup";
import {TeamPlayerActivity} from "../models/views/TeamPlayerActivity";
import { isNotNullAndUndefined } from "../utils/Utils"
import{ GamePosition } from "../models/GamePosition";
import {logger} from "../logger";

@Authorized()
@JsonController('/gtattendances')
export class GameAttendanceController extends BaseController {

    @Get('/aggregate')
    async aggregate(
        @QueryParam('competitionId') competitionId: number
    ): Promise<TeamPlayerActivity[]> {
      return this.attendanceService.findActivityByParam(competitionId);
    }

    @Get('/:id')
    async get(@Param("id") id: number) {
        return this.gameTimeAttendanceService.findById(id);
    }

    @Get('/')
    async find(
        @QueryParam('matchId') matchId: number,
        @QueryParam('teamId') teamId: number,
        @QueryParam('playerId') playerId: number,
        @QueryParam('period') period: number,
        @QueryParam('positionId') positionId: number,
        @QueryParam('latest') latest: boolean,
    ): Promise<GameTimeAttendance[]> {
        return this.gameTimeAttendanceService.findByParam(matchId, teamId, playerId, period, positionId, latest);
    }

    @Post('/save')
    async savePlayers(@HeaderParam("authorization") user: User,
                      @QueryParam('matchId', {required: true}) matchId: number,
                      @QueryParam('teamId', {required: true}) teamId: number,
                      @QueryParam('period') period: number,
                      @Body() attendance: GameTimeAttendance[],
                      @Res() response: Response) {
        let match = await this.matchService.findById(matchId);

        if (match.matchStatus == null && match.matchStatus != 'ENDED') {
            await this.gameTimeAttendanceService.deleteByMatchAndTeam(matchId, teamId, period, false, null);
            if (attendance.length > 0) {
                for (let att of attendance) {
                    att.matchId = matchId;
                    att.teamId = teamId;
                    att.period = period;
                    att.createdBy = user.id;
                    att.createdAt = att.createdAt ? att.createdAt : new Date();
                }
                await this.gameTimeAttendanceService.batchUpdate(attendance);
                let tokens = (await this.deviceService.findScorerDeviceFromRoster(matchId)).map(device => device.deviceId);
                if (tokens && tokens.length > 0) {
                    this.firebaseService.sendMessageChunked({
                        tokens: tokens,
                        data: {
                            type: 'attendance_added',
                            matchId: matchId.toString(),
                            teamId: teamId.toString()
                        }
                    })
                }
                return response.status(200).send({message: 'Players saved'});
            } else {
                return response.status(400).send({name: 'save_attendance_error', message: 'List attendance is empty'});
            }
        } else {
            return response.status(400).send({name: 'save_attendance_error', message: 'Attendance cannot be submitted after a match has ended'});
        }

    }


    @Patch('/update')
    async updatePlayers(@HeaderParam("authorization") user: User,
                        @QueryParam('matchId') matchId: number,
                        @QueryParam('teamId') teamId: number,
                        @QueryParam('period') period: number,
                        @QueryParam('updateMatchEvents') updateMatchEvents: boolean,
                        @Body() attendance: GameTimeAttendance[],
                        @Res() response: Response) {
        if (!matchId) return response.status(400)
            .send({name: 'validation_error', message: 'Match id required'});
        if (!teamId) return response.status(400)
            .send({name: 'validation_error', message: 'Team id required'});

        console.time('matchService.findById');
        let match = await this.matchService.findById(matchId);
        console.timeEnd('matchService.findById');
        if (match.matchStatus != 'ENDED') {
            if (attendance.length > 0) {
                try {
                   await this.updateGameTimeAttendances(
                      match,
                      teamId,
                      attendance,
                      period,
                      updateMatchEvents,
                      user
                   );
                } catch (err) {
                    logger.error(`Failed upload of attendances due to -`, err);
                    return response.status(400).send({
                        err, name: 'unexpected_error', message: 'Failed to save the attendances.'
                  });
                }

                return response.status(200).send({message: 'Players updated'});
            } else {
                return response.status(400).send({name: 'updated_attendance_error', message: 'List attendance is empty'});
            }
        } else {
            return response.status(400).send({name: 'update_attendance_error', message: 'Attendance cannot be submitted after a match has ended'});
        }
    }

    private async updateGameTimeAttendances(
        match: Match,
        teamId: number,
        attendances: GameTimeAttendance[],
        period: number,
        updateMatchEvents: boolean,
        user: User,
    ) { 
        let gsPlayerId;
        let gaPlayerId;

        let save: GameTimeAttendance[] = [];
        for (let att of attendances) {
            if (!period) {
                period = att.period;
            }
            let gta = await this.gameTimeAttendanceService.findPlayerByParamAndLast(match.id, teamId, att.playerId);
            if (gta) {
                if ((att.period && gta.period != att.period) ||
                    (att.positionId && gta.positionId != att.positionId) ||
                    (gta.isPlaying != att.isPlaying)) {
                    save.push(this.gameTimeAttendanceService.prepare(match.id, teamId, period, att, user.id));
                }
            } else {
                save.push(this.gameTimeAttendanceService.prepare(match.id, teamId, period, att, user.id));
            }
            if (updateMatchEvents) {
                /// Checking for any player with position Goal shooter or
                /// goal attack
                if (att.positionId == GamePosition.GOAL_SHOOTER) {
                    gsPlayerId = att.playerId;
                } else if (att.positionId == GamePosition.GOAL_ATTACK) {
                    gaPlayerId = att.playerId;
                }
            }
        }
        await this.gameTimeAttendanceService.batchUpdate(save);
        if (updateMatchEvents) {
            let team = match.team1Id == teamId ? 'team1' : 'team2';
            if (isNotNullAndUndefined(gsPlayerId)) {
                this.matchService.updateMatchStatEvent(
                    match.id,
                    team,
                    GamePosition.GOAL_SHOOTER,
                    gsPlayerId
                );
            } else if(isNotNullAndUndefined(gaPlayerId)) {
                this.matchService.updateMatchStatEvent(
                    match.id,
                    team,
                    GamePosition.GOAL_ATTACK,
                    gaPlayerId
                );
            }
        }
        let tokens = (await this.deviceService.findScorerDeviceFromRoster(match.id)).map(device => device.deviceId);
        if (tokens && tokens.length > 0) {
            this.firebaseService.sendMessageChunked({
                tokens: tokens,
                data: {
                    type: 'attendance_added',
                    matchId: match.id.toString(),
                    teamId: teamId.toString()
                }
            })
        }
    }

    @Delete('/')
    async delete(
        @QueryParam('matchId') matchId: number,
        @QueryParam('teamId') teamId: number,
        @QueryParam('period') period: number,
        @Res() response: Response
    ): Promise<any> {
        let result = await this.gameTimeAttendanceService.deleteByMatchAndTeam(matchId, teamId, period, false, null);
        if (result.affected > 0) {
            return response.status(200).send({name: 'delete', message: 'record deleted'});
        } else {
            return response.status(200).send({name: 'delete', message: 'record not found'});
        }
    }

    @Delete('/:id')
    async deleteById(@Param("id") id: number) {
        return this.gameTimeAttendanceService.deleteById(id);
    }

    @Post('/manualUpload')
    async manualUpload(
        @HeaderParam("authorization") user: User,
        @QueryParam('matchId') matchId: number,
        @QueryParam('teamId') teamId: number,
        @QueryParam('saveAttendance') saveAttendance: boolean = true,
        @Body() attendance: GameTimeAttendance[],
        @Res() response: Response
    ): Promise<any> {
        if (!matchId) return response.status(400)
            .send({name: 'validation_error', message: 'Match id required'});
        if (!teamId) return response.status(400)
            .send({name: 'validation_error', message: 'Team id required'});

        const match = await this.matchService.findById(matchId);
        const comp = await this.competitionService.findById(match.competitionId);
        if (attendance.length > 0) {
            /// Line up
            if (comp.lineupSelectionEnabled == true) {
                var lineupArray = new Array();
                for (let att of attendance) {
                    let lineup: Lineup = new Lineup();
                    lineup.matchId = att.matchId;
                    lineup.competitionId = comp.id;
                    lineup.teamId = att.teamId;
                    lineup.playerId = att.playerId;
                    lineup.positionId = att.positionId;
                    lineup.playing = att.isPlaying;
                    lineup.borrowed = att.isBorrowed;
                    lineup.verifiedBy = att.verifiedBy;
                    lineupArray.push(lineup);
                }

                try {
                    if (lineupArray) {
                        await this.matchService.deleteLineups(matchId, teamId);
                        await this.matchService.batchSaveLineups(lineupArray);
                    } else {
                        return response.status(400).send({
                            name: 'validation_error',
                            message: `Unable to create lineups`
                        });
                    }
                } catch (e) {
                    logger.error(`Failed to create lineup due to -`, e);
                    return response.status(400).send({
                        name: 'updated_attendance_error',
                        message: `Failed to create lineup`
                    });
                }
            }
            if (saveAttendance) {
              /// Game time attendance
              try {
                 await this.updateGameTimeAttendances(
                    match,
                    teamId,
                    attendance,
                    null,
                    true,
                    user
                 );
              } catch (err) {
                  logger.error(`Failed upload of attendances due to -`, err);
                  return response.status(400).send({
                      err, name: 'unexpected_error', message: 'Failed to save the attendances.'
                });
              }
            }

            return response.status(200).send({message: 'Success'});
        } else {
            return response.status(400).send({name: 'updated_attendance_error', message: 'List attendance is empty'});
        }
    }
}
