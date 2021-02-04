import {BaseController} from "./BaseController";
import {Authorized, JsonController, OnUndefined, Param, Post, Res} from "routing-controllers";
import {Response} from 'express';

@JsonController('/competitions/:competitionId/umpires')
@Authorized()
export class UmpireAllocationController extends BaseController {

    @Post('/allocation')
    @OnUndefined(200)
    async allocateUmpires(
        @Param('competitionId') competitionId: number,
        @Res() response: Response,
    ): Promise<void> {

        await this.umpireAllocationService.allocateUmpires(competitionId);
    }
}
