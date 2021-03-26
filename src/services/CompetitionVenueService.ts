import { Service } from "typedi";
import BaseService from "./BaseService";
import { CompetitionVenue } from "../models/CompetitionVenue";
import { VenueCourt } from "../models/VenueCourt";
import { Venue } from "../models/Venue";


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

  public async findVenueCourts(venueId: number): Promise<any> {
    const query = this.entityManager.createQueryBuilder(VenueCourt, 'vc')
        .select()
        .where("vc.venueId = :venueId", { venueId });
    return query.getMany();
  }

  public async findByCourtNameNotWorking(name?: string, competitionId?: number): Promise<any> {
    let query = this.entityManager.createQueryBuilder(VenueCourt, 'vc')
        .select(['vc.id as id'])
        .innerJoin(Venue, 'v', '(v.id = vc.venueId)')
        .innerJoin(CompetitionVenue, 'cv', '(cv.venueId = v.id)')
        .andWhere('cv.competitionId = :competitionId', { competitionId })
        .andWhere("vc.name = :name", { name });
    return query.getMany();
  }

  // temp workaround as can't make the findByCourtNameNotWorking work!
  public async findByCourtName(name?: string, competitionId?: number): Promise<any[]> {
    return this.entityManager.query(
        'select vc.id, vc.name' +
        '    from wsa_common.venueCourt vc \n' +
        '    inner join wsa_common.venue v on v.id = vc.venueId\n' +
        '    inner join wsa.competitionVenue cv on cv.venueId = v.id\n' +
        'where cv.competitionId = ? \n' +
        '    and vc.name = ?;'
        , [competitionId, name])
  }

  public async findByCourtAndVenueName(venueName: string, courtName: string, competitionId: number): Promise<any[]> {
    return this.entityManager.query(
        'select vc.id, vc.name, vc.courtNumber' +
        '    from wsa_common.venueCourt vc \n' +
        '    inner join wsa_common.venue v on v.id = vc.venueId\n' +
        '    inner join wsa.competitionVenue cv on cv.venueId = v.id\n' +
        'where cv.competitionId = ? \n' +
        '    and vc.name = ? \n' +
        '    and v.name = ?;'
        , [competitionId, courtName, venueName]);
  }
}