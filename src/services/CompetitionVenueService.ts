import { Service } from "typedi";
import BaseService from "./BaseService";
import { CompetitionVenue } from "../models/CompetitionVenue";
import { Brackets } from "typeorm";


@Service()
export default class CompetitionVenueService extends BaseService<CompetitionVenue> {

  modelName(): string {
    return CompetitionVenue.name;
  }

  public async getByCompetitionId(id?: number) {
    return this.entityManager
      .createQueryBuilder()
      .select()
      .from(CompetitionVenue, 'c')
      .where('competitionId = :id', { id })
      .execute();
  }

  public async deleteByCompetitionId(id?: number) {
    return this.entityManager
      .createQueryBuilder()
      .delete()
      .from(CompetitionVenue, 'c')
      .where('competitionId = :id', { id })
      .execute();
  }

}