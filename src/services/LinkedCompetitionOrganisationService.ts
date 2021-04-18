import { Service } from 'typedi';
import BaseService from './BaseService';
import { LinkedCompetitionOrganisation } from '../models/LinkedCompetitionOrganisation';
import { isArrayPopulated } from '../utils/Utils';

@Service()
export default class LinkedCompetitionOrganisationService extends BaseService<LinkedCompetitionOrganisation> {
  modelName(): string {
    return LinkedCompetitionOrganisation.name;
  }

  public async findByNameAndCompetitionId(
    name: string,
    competitionId?: number,
  ): Promise<LinkedCompetitionOrganisation[]> {
    let query = this.entityManager
      .createQueryBuilder(LinkedCompetitionOrganisation, 'linkedCompetitionOrganisation')
      .innerJoinAndSelect(
        'linkedCompetitionOrganisation.competition',
        'competition',
        'competition.deleted_at is null',
      );
    if (name) {
      query = query.where('LOWER(linkedCompetitionOrganisation.name) like :name', {
        name: `${name.toLowerCase()}%`,
      });
    }

    if (competitionId) {
      query = query.andWhere('linkedCompetitionOrganisation.competitionId = :competitionId', {
        competitionId,
      });
    }
    return query.getMany();
  }

  public async findByUniqueKey(organisationKey: string): Promise<any> {
    const query = await this.entityManager.query(
      `select o.* from wsa_users.organisation as o where o.organisationUniqueKey = ? and o.isDeleted = 0`,
      [organisationKey],
    );
    if (isArrayPopulated(query)) {
      return query[0].id;
    } else {
      return 0;
    }
  }

  public async findAffiliateDetailsByOrganisationId(organisationId: number): Promise<any> {
    const query = await this.entityManager.query(
      `select a2.* from wsa_users.affiliate a2 where a2.affiliateOrgId = ? and a2.isDeleted = 0`,
      [organisationId],
    );
    if (isArrayPopulated(query)) {
      return query[0].organisationTypeRefId;
    } else {
      return 0;
    }
  }

  public async getOrganisationLogoDetails(organisationId: number): Promise<any> {
    const query = await this.entityManager.query(
      `select distinct o.id,o.name,ol.logoUrl from wsa_users.organisation o join wsa_users.organisationLogo ol
            on ol.organisationId = o.id and o.isDeleted = 0 where o.id = ? group by o.id`,
      [organisationId],
    );
    if (isArrayPopulated(query)) {
      return query[0];
    } else {
      return [];
    }
  }

  public async findByOrganisationId(
    organisationId: number,
  ): Promise<LinkedCompetitionOrganisation> {
    let query = this.entityManager
      .createQueryBuilder(LinkedCompetitionOrganisation, 'linkedCompetitionOrganisation')
      .andWhere('linkedCompetitionOrganisation.organisationId = :organisationId', {
        organisationId,
      });
    return query.getOne();
  }
}
