import {
  Get,
  Post,
  JsonController,
  HeaderParam,
  QueryParam,
  Body,
  Authorized, Res,
} from 'routing-controllers';
import { Response } from 'express';

import { BaseController } from './BaseController';
import { PlayerMinuteTracking } from '../models/PlayerMinuteTracking';
import { GameTimeAttendance } from '../models/GameTimeAttendance';
import { User } from '../models/User';
import { isArrayPopulated, isNotNullAndUndefined } from "../utils/Utils"
import {logger} from "../logger";

@JsonController('/pmt')
export class PlayerMinuteTrackingController extends BaseController {

  @Get('/')
  async find(
    @QueryParam('matchId', {required: true}) matchId: number,
    @QueryParam('teamId') teamId: number,
    @QueryParam('playerId') playerId: number,
    @Res() response: Response
  ): Promise<any> {
    try {
      const trackData = await this.playerMinuteTrackingService.findByParams(matchId, teamId, playerId);

      return response.status(200).send({ success: true, data: trackData });
    } catch (e) {
      return response.status(500).send(
        {
          success: false,
          data: [],
          message: 'Fetch tracking time data failed',
        });
    }
  }

  @Authorized()
  @Post('/record')
  async record(
    @HeaderParam("authorization") user: User,
    @QueryParam('matchId', {required: true}) matchId: number,
    @Body() trackingData: PlayerMinuteTracking[],
    @Res() response: Response
  ): Promise<any> {
    try {
        /// --- Deleting (Currently doing hard delete)
        /// PMT items which are not send in the body
        const matchPMTData = await this.playerMinuteTrackingService.findByMatch(matchId);
        const matchGTAData = await this.gameTimeAttendanceService.findByMatch(matchId);
        let deletePMTs = [];
        const pmtIds = matchPMTData.filter(function(existingPMT){
            // filter out (!) items in existing PMT which are not been
            // provided in the body
            return !(!!trackingData && trackingData.some(function(newPMT){
                return existingPMT.id === newPMT.id;
            }));
        }).map(function(pmt){
            deletePMTs.push(pmt);
            return pmt.id;
        });

        if (pmtIds.length > 0) {
            await this.playerMinuteTrackingService.deleteByIds(pmtIds);
        }
        /// GameTimeAttendance items matching the PMTs deleted with isPlaying true
        var gtaIds = matchGTAData.filter(function(existingGTA){
            // filter out items in matching deleted PMTs
            return deletePMTs.some(function(pmt){
                return (existingGTA.playerId === pmt.playerId &&
                    existingGTA.period === pmt.period &&
                    isNotNullAndUndefined(existingGTA) &&
                    existingGTA.isPlaying);
            });
        }).map(function(gta){
            return gta.id;
        });
        if (gtaIds.length > 0) {
            await this.gameTimeAttendanceService.deleteByIds(gtaIds);
        }
        /// ---

        const pmtPromises = [];

        for (let i = 0; i < trackingData.length; i++) {
            if (isNotNullAndUndefined(trackingData[i].matchId)
                && isNotNullAndUndefined(trackingData[i].teamId)
                && isNotNullAndUndefined(trackingData[i].playerId)
                && isNotNullAndUndefined(trackingData[i].period)
                && isNotNullAndUndefined(trackingData[i].duration)
            ) {
                pmtPromises.push(
                    this.createPMTRecord(trackingData[i], matchGTAData, user)
                );
            }
        }

        await Promise.all(pmtPromises);

        return response.status(200).send({ success: true });
    } catch (e) {
        logger.error(`Failed PMT record due to error -`, e);
        return response.status(500).send({ success: false, message: 'Recording tracking time failed' });
    }
  }

  private async createPMTRecord(
      playerMinuteTracking: PlayerMinuteTracking,
      matchGTAData: GameTimeAttendance[],
      user: User,
  ) {
      try {
          if (!isNotNullAndUndefined(playerMinuteTracking.period) ||
              playerMinuteTracking.period == 0) {
                  throw `Wrong period sent for player with id - ${playerMinuteTracking.playerId}`;
          }

          let player;
          if (playerMinuteTracking.playerId) {
              player = await this.playerService.findById(playerMinuteTracking.playerId);
          }

          const data = playerMinuteTracking.id
            ? await this.playerMinuteTrackingService.findById(playerMinuteTracking.id)
            : new PlayerMinuteTracking();
          data.matchId = playerMinuteTracking.matchId;
          data.teamId = playerMinuteTracking.teamId;
          data.playerId = playerMinuteTracking.playerId;
          data.period = playerMinuteTracking.period;
          data.positionId = isNotNullAndUndefined(playerMinuteTracking.positionId) ?
                playerMinuteTracking.positionId : 0;
          data.duration = isNotNullAndUndefined(playerMinuteTracking.duration) ?
                playerMinuteTracking.duration : 0;
          data.playedInPeriod = isNotNullAndUndefined(playerMinuteTracking.playedInPeriod) ?
              playerMinuteTracking.playedInPeriod : false;
          data.playedEndPeriod = isNotNullAndUndefined(playerMinuteTracking.playedEndPeriod) ?
              playerMinuteTracking.playedEndPeriod : false;
          data.playedFullPeriod = isNotNullAndUndefined(playerMinuteTracking.playedFullPeriod) ?
               playerMinuteTracking.playedFullPeriod : false;
          data.periodDuration = isNotNullAndUndefined(playerMinuteTracking.periodDuration) ?
               playerMinuteTracking.periodDuration : 0;
          data.source = playerMinuteTracking.source;
          data.createdBy = playerMinuteTracking.createdBy;
          data.updatedBy = playerMinuteTracking.updatedBy;

          await this.playerMinuteTrackingService.createOrUpdate(data);

          let createGTA = false;
          /// Game Time Attendance checks
          if (matchGTAData && matchGTAData.length > 0) {
              // Check if we have gameTimeAttendance record for the PMT entry
              const filteredGTA = matchGTAData.filter(
                  (gta) => (gta.playerId === playerMinuteTracking.playerId &&
                      gta.period === playerMinuteTracking.period &&
                      isNotNullAndUndefined(gta.isPlaying) &&
                      gta.isPlaying));
              if (!isArrayPopulated(filteredGTA)) {
                  createGTA = true;
              }
          } else {
              // Create a gameTimeAttendance record for the PMT entry
              createGTA = true;
          }
          if (createGTA) {
              let gta = new GameTimeAttendance();
              gta.matchId = data.matchId;
              gta.teamId = data.teamId;
              gta.playerId = data.playerId;
              gta.period = data.period;
              gta.positionId = data.positionId;
              if (player &&
                  isNotNullAndUndefined(player.teamId) &&
                  isNotNullAndUndefined(data.teamId)) {
                      gta.isBorrowed = (player.teamId != data.teamId);
              } else {
                    gta.isBorrowed = false;
              }
              gta.isPlaying = true;
              gta.source = data.source;
              if (!isNotNullAndUndefined(data.id) &&
                  isNotNullAndUndefined(data.createdBy)) {
                      gta.createdBy = data.createdBy;
              } else if (isNotNullAndUndefined(data.updatedBy)) {
                  gta.createdBy = data.updatedBy;
              } else {
                  gta.createdBy = user.id;
              }
              gta.createdAt = new Date();

              await this.gameTimeAttendanceService.createOrUpdate(gta);
          }
      } catch (error) {
          throw error;
      }
  }
}
