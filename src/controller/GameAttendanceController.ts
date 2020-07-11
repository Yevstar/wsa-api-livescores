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
import {TeamPlayerActivity} from "../models/views/TeamPlayerActivity";
import { isNotNullAndUndefined } from "../utils/Utils"
import{ GamePosition } from "../models/GamePosition";

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
                    this.firebaseService.sendMessage({
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
        let gsPlayerId;
        let gaPlayerId;
        if (match.matchStatus != 'ENDED') {
            if (attendance.length > 0) {
                let save: GameTimeAttendance[] = [];
                for (let att of attendance) {
                    let gta = await this.gameTimeAttendanceService.findPlayerByParamAndLast(matchId, teamId, att.playerId);
                    if (gta) {
                        if ((att.period && gta.period != att.period) ||
                            (att.positionId && gta.positionId != att.positionId) ||
                            (att.isPlaying && gta.isPlaying != att.isPlaying)) {
                            save.push(this.gameTimeAttendanceService.prepare(matchId, teamId, period, att, user.id));
                        }
                    } else {
                        save.push(this.gameTimeAttendanceService.prepare(matchId, teamId, period, att, user.id));
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
                            matchId,
                            team,
                            GamePosition.GOAL_SHOOTER,
                            gsPlayerId
                        );
                    } else if(isNotNullAndUndefined(gaPlayerId)) {
                        this.matchService.updateMatchStatEvent(
                            matchId,
                            team,
                            GamePosition.GOAL_ATTACK,
                            gaPlayerId
                        );
                    }
                }
                let tokens = (await this.deviceService.findScorerDeviceFromRoster(matchId)).map(device => device.deviceId);
                if (tokens && tokens.length > 0) {
                    this.firebaseService.sendMessage({
                        tokens: tokens,
                        data: {
                            type: 'attendance_added',
                            matchId: matchId.toString(),
                            teamId: teamId.toString()
                        }
                    })
                }
                return response.status(200).send({message: 'Players updated'});
            } else {
                return response.status(400).send({name: 'updated_attendance_error', message: 'List attendance is empty'});
            }
        } else {
            return response.status(400).send({name: 'update_attendance_error', message: 'Attendance cannot be submitted after a match has ended'});
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
}
