import {BaseController} from "./BaseController";
import {Authorized, JsonController, Param, Post} from "routing-controllers";

@JsonController('/competitions/:competitionId/umpires')
@Authorized()
export class UmpireAllocationController extends BaseController {

    @Post('allocation')
    allocateUmpires(
        @Param('competitionId') competitionId: number,
    ): Promise<void> {
        this.umpireAllocationService.allocateUmpires(competitionId);

        return;
    }
}
