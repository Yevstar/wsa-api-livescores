import { Authorized, Body, JsonController, Param, Patch } from 'routing-controllers';
import { BaseController } from './BaseController';
import { UmpirePoolsAllocationUpdateDto } from '../models/dto/UmpirePoolsAllocationUpdateDto';
import { UmpirePool } from '../models/UmpirePool';

@JsonController('/competitions/:competitionId/umpires/pools/divisions')
@Authorized()
export class UmpirePoolsAllocationController extends BaseController {
  @Patch()
  updateMany(
    @Param('competitionId') competitionId: number,
    @Body() body: UmpirePoolsAllocationUpdateDto,
  ): Promise<UmpirePool[]> {
    return this.umpirePoolService.updateUmpireAllocation(competitionId, body);
  }
}
