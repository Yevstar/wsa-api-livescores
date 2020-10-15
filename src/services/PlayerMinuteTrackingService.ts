import { Service } from "typedi";

import BaseService from "./BaseService";
import {DeleteResult} from "typeorm-plus";
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
      .leftJoinAndSelect('pmt.position', 'position')
      .andWhere("pmt.matchId = :matchId", { matchId });

    if (teamId) query.andWhere("pmt.teamId = :teamId", { teamId });
    if (playerId) query.andWhere('pmt.playerId = :playerId', { playerId });

    return query.getMany();
  }

  public async findByMatch(matchId: number): Promise<PlayerMinuteTracking[]> {
      let query = this.entityManager.createQueryBuilder(PlayerMinuteTracking, 'pmt')
        .andWhere("pmt.matchId = :matchId", { matchId });
      return query.getMany();
  }

  public async deleteByIds(ids: number[]): Promise<DeleteResult> {
      return this.entityManager.createQueryBuilder().delete().from(PlayerMinuteTracking)
          .andWhere("id in (:ids)", {ids: ids}).execute();
  }
}
