import {
    JsonController,
    Body,
    Post,
} from "routing-controllers";

import { BaseController } from "./BaseController";

@JsonController("/mergeUsers")
export class MergeUsersController extends BaseController {

    @Post("/players")
    async find(
        @Body() payload: any
    ): Promise<any> {
        return await this.playerService.updatePlayerId(payload.oldUserId, payload.newUserId);
    }
}
