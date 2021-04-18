import { Service } from 'typedi';
import BaseService from './BaseService';
import { Brackets } from 'typeorm-plus';
import { Round } from '../models/Round';
import { isArrayPopulated } from '../utils/Utils';

@Service()
export default class RoundService extends BaseService<Round> {
  modelName(): string {
    return Round.name;
  }

  public async findByParam(
    competitionId: number,
    competitionOrganisationIds: number[],
    divisionId: number,
    sequence: number,
    teamIds: number[] = [],
    search: string,
  ): Promise<Round[]> {
    let query = this.entityManager
      .createQueryBuilder(Round, 'r')
      .leftJoinAndSelect('r.matches', 'match')
      .leftJoinAndSelect('match.team1', 'team1')
      .leftJoinAndSelect('match.team2', 'team2')
      .leftJoinAndSelect('match.venueCourt', 'venueCourt')
      .leftJoinAndSelect('match.round', 'round')
      .leftJoinAndSelect('venueCourt.venue', 'venue')
      .andWhere('match.deleted_at is null');

    if (competitionId) query.andWhere('r.competitionId = :competitionId', { competitionId });
    if (isArrayPopulated(competitionOrganisationIds)) {
      query.andWhere(
        '(team1.competitionOrganisationId in ' +
          '(:competitionOrganisationIds) or team2.competitionOrganisationId ' +
          'in (:competitionOrganisationIds))',
        { competitionOrganisationIds },
      );
    }
    if (divisionId) query.andWhere('r.divisionId = :divisionId', { divisionId });
    if (sequence) query.andWhere('r.sequence = :sequence', { sequence });
    if (search !== null && search !== undefined && search !== '') {
      query.andWhere('(LOWER(r.name) like :search)', { search: `%${search.toLowerCase()}%` });
    }
    if (isArrayPopulated(teamIds)) {
      query.andWhere('(match.team1Id in (:teamIds) or match.team2Id in ' + '(:teamIds))', {
        teamIds,
      });
    }

    query.orderBy('match.startTime');
    return query.getMany();
  }

  public async findByName(
    competitionId: number,
    roundName: string,
    divisionId?: number,
  ): Promise<Round[]> {
    let query = this.entityManager
      .createQueryBuilder(Round, 'r')
      .andWhere('r.name = :roundName', { roundName })
      .andWhere('r.competitionId = :competitionId', { competitionId });
    if (divisionId) {
      query.andWhere('r.divisionId = :divisionId', { divisionId });
    }
    query.orderBy('r.divisionId');
    return query.getMany();
  }

  public async findUniqueNames(competitionId: number): Promise<Round[]> {
    return this.entityManager.query(
      'select `sequence`, min(name) from `round`\n' +
        'where competitionId = ?\n' +
        'group by `sequence`;',
      [competitionId],
    );
  }
}
