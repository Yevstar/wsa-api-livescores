import { Service } from "typedi";
import BaseService from "./BaseService";
import { CompetitionVenue } from "../models/CompetitionVenue";
import { VenueCourt } from "../models/VenueCourt";
import { Venue } from "../models/Venue";
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

  public async findByCourtName(name?: string, competitionId?: number): Promise<VenueCourt[]> {
    let query = this.entityManager.createQueryBuilder(VenueCourt, 'vc')
        .select(['vc.id as id'])
        .innerJoin(Venue, 'v', '(v.id = vc.venueId)')
        .innerJoin(CompetitionVenue, 'cv', '(cv.venueId = v.id)')
        .andWhere('cv.id = :competitionId', { competitionId })
        .andWhere("vc.name = :name", { name });
    return query.getMany();
  }

}