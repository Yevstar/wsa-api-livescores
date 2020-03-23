import { Service } from "typedi";
import BaseService from "./BaseService";
import { CompetitionLadderSettings } from "../models/CompetitionLadderSettings";
import { Brackets } from "typeorm";


@Service()
export default class CompetitionLadderSettingsService extends BaseService<CompetitionLadderSettings> {

  modelName(): string {
    return CompetitionLadderSettings.name;
  }

  public async getByCompetitionId(id?: number) {
    return this.entityManager
      .createQueryBuilder()
      .select()
      .from(CompetitionLadderSettings, 'ladderSetting')
      .where('competitionId = :id', { id })
      .execute();
  }

  public async deleteByCompetitionId(id?: number) {
    return this.entityManager
      .createQueryBuilder()
      .delete()
      .from(CompetitionLadderSettings, 'ladderSetting')
      .where('competitionId = :id', { id })
      .execute();
  }

}