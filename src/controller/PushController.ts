import { Authorized, Body, JsonController, Post, QueryParam, Res } from 'routing-controllers';
import { Response } from 'express';
import { BaseController } from './BaseController';

@Authorized()
@JsonController('/push')
export class PushController extends BaseController {
  @Post('/')
  async sendPush(
    @QueryParam('title') title: string,
    @QueryParam('body') body: string,
    @QueryParam('userIds') userIds: number[] = [],
    @QueryParam('token') token: string,
    @Body() data: any,
    @Res() response: Response,
  ) {
    if (userIds && !Array.isArray(userIds)) userIds = [userIds];
    let tokens: string[] = [];
    if (userIds.length > 0) {
      tokens = (await this.deviceService.getUserTokens(userIds)).map(device => device.deviceId);
    }
    if (token && !Array.isArray(token)) tokens.push(token);
    if (tokens && tokens.length > 0) {
      this.firebaseService.sendMessageChunked({
        tokens: tokens,
        title: title,
        body: body,
        data: data,
      });
      return response.status(200).send({ name: 'push_success', message: `message sent` });
    } else {
      return response.status(200).send({
        name: 'push_error',
        message: `Tokens for sending message not found`,
      });
    }
  }
}
