import {BaseController} from "./BaseController";
import {
    Authorized, Body,
    HeaderParam,
    JsonController,
    OnUndefined,
    Params,
    Post,
    Req,
    Res
} from "routing-controllers";
import {Request, Response} from 'express';
import {User} from "../models/User";
import {UmpireAllocationBodyParams} from "./dto/UmpireAllocationBodyParams";
import {UmpireAllocationPathParams} from "./dto/UmpireAllocationPathParams";

@JsonController('/competitions/:competitionId/umpires')
@Authorized()
export class UmpireAllocationController extends BaseController {

    @Post('/allocation')
    @OnUndefined(200)
    async allocateUmpires(
        @Req() request: Request,
        @Params() pathParams: UmpireAllocationPathParams,
        @HeaderParam("authorization") currentUser: User,
        @Body() allocationQueryParams: UmpireAllocationBodyParams,
        @Res() response: Response,
    ): Promise<void> {
        const authToken = this.helperService.getAuthTokenFromRequest(request);

        const {competitionId} = await this.validate(response, pathParams, UmpireAllocationPathParams);
        const {rounds} = await this.validate(response, allocationQueryParams, UmpireAllocationBodyParams);

        const allocationDto = {
            competitionId,
            rounds,
        };

        await this.umpireAllocationService.allocateUmpires(allocationDto, authToken, currentUser.id);
    }
}
