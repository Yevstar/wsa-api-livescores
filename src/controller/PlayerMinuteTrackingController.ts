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
        for (let i = 0; i < trackingData.length; i++) {
          if (
            trackingData[i].matchId
          && trackingData[i].teamId
          && trackingData[i].playerId
          && trackingData[i].period
          && trackingData[i].duration
          ) {
            const data = trackingData[i].id
              ? await this.playerMinuteTrackingService.findById(trackingData[i].id)
              : new PlayerMinuteTracking();
            data.matchId = trackingData[i].matchId;
            data.teamId = trackingData[i].teamId;
            data.playerId = trackingData[i].playerId;
            data.period = trackingData[i].period;
            data.duration = trackingData[i].duration;

            await this.playerMinuteTrackingService.createOrUpdate(data);
          }
        }
      }

      return response.status(200).send({ success: true });
    } catch (e) {
      return response.status(500).send({ success: false, message: 'Recording tracking time failed' });
    }
  }
}
