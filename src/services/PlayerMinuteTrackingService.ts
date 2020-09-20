import { Service } from "typedi";

import BaseService from "./BaseService";
import { PlayerMinuteTracking } from "../models/PlayerMinuteTracking";

@Service()
export default class PlayerMinuteTrackingService extends BaseService<PlayerMinuteTracking> {

  modelName(): string {
    return PlayerMinuteTracking.name;
  }

  public async findByParams(
    matchId: number,
    teamId: number,
    playerId: number
  ): Promise<PlayerMinuteTracking[]> {
    let query = this.entityManager.createQueryBuilder(PlayerMinuteTracking, 'pmt')
      .andWhere("pmt.matchId = :matchId", { matchId });

    if (teamId) query.andWhere("pmt.teamId = :teamId", { teamId });
    if (playerId) query.andWhere('pmt.playerId = :playerId', { playerId });

    return query.getMany()
  }
}
