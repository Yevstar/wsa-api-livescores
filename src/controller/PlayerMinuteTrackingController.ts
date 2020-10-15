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
    @QueryParam('matchId', {required: true}) matchId: number,
    @Body() trackingData: PlayerMinuteTracking[],
    @Res() response: Response
  ): Promise<any> {
    try {
        if (trackingData && trackingData.length > 0) {
            /// --- Deleting PMT items which are not send in the body
            /// Currently doing hard delete
            let matchPMTData = await this.playerMinuteTrackingService.findByMatch(matchId);
            var result = matchPMTData.filter(function(existingPMT){
                // filter out (!) items in result2
                return !trackingData.some(function(newPMT){
                    return existingPMT.id === newPMT.id;
                });
            }).map(function(pmt){
                return pmt.id;
            });
            if (result.length > 0) {
                await this.playerMinuteTrackingService.deleteByIds(result);
            }
            /// ---

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

            return response.status(200).send({ success: true });
        } else {
            return response.status(212).send({ success: false, message: 'No player minute tracking data has been sent' });
        }
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
