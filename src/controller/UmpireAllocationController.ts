import {BaseController} from "./BaseController";
import {Authorized, HeaderParam, JsonController, OnUndefined, Param, Post, Req, Res} from "routing-controllers";
import {Request, Response} from 'express';
import {User} from "../models/User";

@JsonController('/competitions/:competitionId/umpires')
@Authorized()
export class UmpireAllocationController extends BaseController {

    @Post('/allocation')
    @OnUndefined(200)
    async allocateUmpires(
        @Req() request: Request,
        @Param('competitionId') competitionId: number,
        @HeaderParam("authorization") currentUser: User,
        @Res() response: Response,
    ): Promise<void> {
        const authToken = this.helperService.getAuthTokenFromRequest(request);

        await this.umpireAllocationService.allocateUmpires(competitionId, authToken, currentUser.id);
    }
}
