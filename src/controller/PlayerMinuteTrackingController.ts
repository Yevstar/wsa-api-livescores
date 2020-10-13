import {
  Get,
  Post,
  JsonController,
  QueryParam,
  Body,
  Authorized, Res,
} from 'routing-controllers';
import { Response } from 'express';

import { BaseController } from './BaseController';
import { PlayerMinuteTracking } from '../models/PlayerMinuteTracking';

@JsonController('/pmt')
export class PlayerMinuteTrackingController extends BaseController {

  @Get('/')
  async find(
    @QueryParam('matchId') matchId: number,
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
    @Body() trackingData: PlayerMinuteTracking[],
    @Res() response: Response
  ): Promise<any> {
    try {
      if (trackingData && trackingData.length > 0) {
        const pmtPromises = [];

        for (let i = 0; i < trackingData.length; i++) {
          if (trackingData[i].matchId
              && trackingData[i].teamId
              && trackingData[i].playerId
              && trackingData[i].period
              && trackingData[i].duration
          ) {
              pmtPromises.push(
                  this.createPMTRecord(trackingData[i])
              );
          }
        }

        await Promise.all(pmtPromises);
      }

      return response.status(200).send({ success: true });
    } catch (e) {
      return response.status(500).send({ success: false, message: 'Recording tracking time failed' });
    }
  }

  private async createPMTRecord(trackingData: PlayerMinuteTracking) {
      try {
          const data = trackingData.id
            ? await this.playerMinuteTrackingService.findById(trackingData.id)
            : new PlayerMinuteTracking();
          data.matchId = trackingData.matchId;
          data.teamId = trackingData.teamId;
          data.playerId = trackingData.playerId;
          data.period = trackingData.period;
          if (trackingData.positionId != null ||
              trackingData.positionId != undefined) {
              data.positionId = trackingData.positionId;
          }
          data.duration = trackingData.duration;
          if (trackingData.playedInPeriod != null ||
              trackingData.playedInPeriod != undefined) {
              data.playedInPeriod = trackingData.playedInPeriod;
          }
          if (trackingData.playedEndPeriod != null ||
              trackingData.playedEndPeriod != undefined) {
              data.playedEndPeriod = trackingData.playedEndPeriod;
          }
          if (trackingData.playedFullPeriod != null ||
              trackingData.playedFullPeriod != undefined) {
              data.playedFullPeriod = trackingData.playedFullPeriod;
          }
          if (trackingData.periodDuration) {
              data.periodDuration = trackingData.periodDuration;
          }

          await this.playerMinuteTrackingService.createOrUpdate(data);
      } catch (error) {
          throw error;
      }
  }
}
