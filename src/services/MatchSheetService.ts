import {Service} from "typedi";
import BaseService from "./BaseService";
import {MatchSheet} from "../models/MatchSheet";

@Service()
export default class MatchSheetService extends BaseService<MatchSheet> {

  modelName(): string {
    return MatchSheet.name;
  }

  public async findByUserId(userId?: number): Promise<MatchSheet[]> {
    let query = this.entityManager.createQueryBuilder(MatchSheet, 'matchSheet');
    if (userId !== undefined && userId !== null) {
      query = this.entityManager.createQueryBuilder(MatchSheet, 'matchSheet')
        .andWhere('matchSheet.userId = :userId', {userId});
    }

    return query.getMany()
  }
}
