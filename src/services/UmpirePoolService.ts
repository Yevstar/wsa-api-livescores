import BaseService from './BaseService';
import { UmpirePool } from '../models/UmpirePool';
import { Competition } from '../models/Competition';
import { Inject } from 'typedi';
import CompetitionOrganisationService from './CompetitionOrganisationService';
import { CompetitionParticipatingTypeEnum } from '../models/enums/CompetitionParticipatingTypeEnum';
import { ForbiddenError } from 'routing-controllers';
import { User } from '../models/User';
import UserService from './UserService';
import { UmpirePoolsAllocationUpdateDto } from '../models/dto/UmpirePoolsAllocationUpdateDto';
import { Division } from '../models/Division';
import { UmpireService } from './UmpireService';
import { DeleteResult, In } from 'typeorm-plus';
import { UmpirePoolRank } from '../models/UmpirePoolRank';

export class UmpirePoolService extends BaseService<UmpirePool> {
  modelName(): string {
    return UmpirePool.name;
  }

  @Inject()
  private readonly competitionOrganisationService: CompetitionOrganisationService;

  @Inject()
  private readonly userService: UserService;

  @Inject()
  private readonly umpireService: UmpireService;

  async createOne(
    organisationId: number,
    competitionId: number,
    body: UmpirePool,
  ): Promise<UmpirePool> {
    if (
      CompetitionParticipatingTypeEnum.PARTICIPATED_IN ===
      (await this.competitionOrganisationService.getCompetitionParticipatingType(
        competitionId,
        organisationId,
      ))
    ) {
      throw new ForbiddenError("Participated-in organization can't create pools!");
    }

    body.competition = await this.entityManager.findOneOrFail(Competition, competitionId);
    return await this.createOrUpdate(body);
  }

  async deleteOne(
    organisationId: number,
    competitionId: number,
    umpirePoolId: number,
  ): Promise<DeleteResult> {
    if (
      CompetitionParticipatingTypeEnum.PARTICIPATED_IN ===
      (await this.competitionOrganisationService.getCompetitionParticipatingType(
        competitionId,
        organisationId,
      ))
    ) {
      throw new ForbiddenError("Participated-in organization can't delete pools!");
    }

    const umpirePool = await this.entityManager.findOneOrFail(UmpirePool, umpirePoolId);

    return await this.deleteById(umpirePool.id);
  }

  async updateMany(
    organisationId: number,
    competitionId: number,
    body: UmpirePool[],
  ): Promise<UmpirePool[]> {
    console.log('v1');
    const updatedPools = [];

    for (const updateData of body) {
      const pool = await this.entityManager.findOneOrFail(UmpirePool, updateData.id, {
        relations: ['competition', 'umpires'],
      });
      const allowedUmpiresIds = (
        await this.umpireService.getAllowedUmpiresForOrganisation(competitionId, organisationId)
      ).map(umpire => umpire.id);
      const assignedNotAllowedUmpires = pool.umpires.filter(
        umpire => !allowedUmpiresIds.includes(umpire.id),
      );
      const allowedUmpiresIdsToBeAssigned = updateData.umpires.filter(umpire =>
        allowedUmpiresIds.includes(this.retrievePoolUmpireId(umpire)),
      );
      const allowedUmpiresToBeAssigned = await Promise.all(
        allowedUmpiresIdsToBeAssigned.map(umpireId =>
          this.entityManager.findOneOrFail(User, umpireId),
        ),
      );
      const allowedUmpiresResult = [...assignedNotAllowedUmpires, ...allowedUmpiresToBeAssigned];
      pool.umpires = allowedUmpiresResult;
      const savedPool = await this.entityManager.save(pool);
      savedPool.umpires = allowedUmpiresToBeAssigned;
      updatedPools.push(savedPool);
    }

    return await this.getByCompetitionOrganisation(competitionId, organisationId);
  }

  async updateManyV2(
    organisationId: number,
    competitionId: number,
    body: UmpirePool[],
  ): Promise<UmpirePool[]> {
    console.log('v2');
    const updatedPools = [];

    for (const updateData of body) {
      const pool = await this.entityManager.findOneOrFail(UmpirePool, updateData.id, {
        relations: ['competition', 'umpires'],
      });
      const allowedUmpiresIds = (
        await this.umpireService.getAllowedUmpiresForOrganisation(competitionId, organisationId)
      ).map(umpire => umpire.id);
      const assignedNotAllowedUmpires = pool.umpires.filter(
        umpire => !allowedUmpiresIds.includes(umpire.id),
      );
      const assignedNotAllowedUmpiresIds = assignedNotAllowedUmpires.map(umpire => umpire.id);
      const allowedUmpiresIdsToBeAssigned = updateData.umpires
        .map(umpire => umpire.id)
        .filter(umpire => allowedUmpiresIds.includes(this.retrievePoolUmpireId(umpire)));
      const allowedUmpiresToBeAssigned = await Promise.all(
        allowedUmpiresIdsToBeAssigned.map(umpireId =>
          this.entityManager.findOneOrFail(User, umpireId),
        ),
      );
      const allowedUmpiresResult = [...assignedNotAllowedUmpires, ...allowedUmpiresToBeAssigned];
      pool.umpires = allowedUmpiresResult;
      const savedPool = await this.entityManager.save(pool);
      savedPool.umpires = allowedUmpiresToBeAssigned;
      await this.updateUmpireRanksForPool(
        pool.id,
        updateData.umpires as RawUmpireRank[],
        assignedNotAllowedUmpiresIds,
      );
      updatedPools.push(savedPool);
    }

    return await this.getByCompetitionOrganisation(competitionId, organisationId);
  }

  async updateUmpireRanksForPool(
    umpirePoolId,
    umpireRanks: RawUmpireRank[],
    assignedNotAllowedUmpiresIds: number[],
  ): Promise<void> {
    const notAllowedPoolRanks = await this.entityManager.find(UmpirePoolRank, {
      umpirePoolId,
      umpireId: In(assignedNotAllowedUmpiresIds),
    });
    await this.entityManager.delete(UmpirePoolRank, { umpirePoolId });

    const allowedPoolRanks = umpireRanks.map(umpireRank => {
      const rankToBeSaved = new UmpirePoolRank();
      rankToBeSaved.umpireId = umpireRank.id;
      rankToBeSaved.umpirePoolId = umpirePoolId;
      rankToBeSaved.rank = umpireRank.rank;

      return rankToBeSaved;
    });

    const newPoolRanks = allowedPoolRanks.concat(notAllowedPoolRanks);
    const arrangedPoolRanks = this.arrangePoolRanks(newPoolRanks);

    await this.entityManager.save(arrangedPoolRanks);
  }

  arrangePoolRanks(poolRanks: UmpirePoolRank[]): UmpirePoolRank[] {
    const maxSortedRank = poolRanks.reduce((maxRank: number, poolRank: UmpirePoolRank) => {
      const currentRank = poolRank.rank ?? 0;
      maxRank = currentRank > maxRank ? currentRank : maxRank;
      return maxRank;
    }, 0);

    const sortedRanks = poolRanks.sort((poolRankA, poolRankB) => {
      const rankA = poolRankA.rank ?? maxSortedRank + 1;
      const rankB = poolRankB.rank ?? maxSortedRank + 1;

      return rankA - rankB;
    });

    for (let i = 0; i < sortedRanks.length; i++) {
      sortedRanks[i].rank = i + 1;
    }

    return sortedRanks;
  }

  async getByCompetitionOrganisation(
    competitionId: number,
    organisationId: number,
  ): Promise<UmpirePool[]> {
    const competition = await this.entityManager.findOneOrFail(Competition, competitionId);

    const competitionOrganisation = await this.competitionOrganisationService.getByCompetitionOrganisation(
      competitionId,
      organisationId,
    );

    const umpirePools = await this.entityManager
      .createQueryBuilder(UmpirePool, 'umpirePools')
      .leftJoinAndSelect('umpirePools.competition', 'competition')
      .leftJoinAndSelect('competition.competitionOrganizations', 'competitionOrganizations')
      .leftJoinAndSelect('umpirePools.umpires', 'umpires')
      .loadRelationCountAndMap('umpires.matchesCount', 'umpires.matchUmpires')
      .leftJoinAndSelect('umpires.competitionRank', 'competitionRank')
      .leftJoinAndSelect('umpires.umpirePoolRank', 'umpirePoolRank')
      .leftJoinAndSelect('umpirePools.divisions', 'divisions')
      .where('umpirePools.competitionId = :competitionId', { competitionId })
      .getMany();

    for (const umpirePool of umpirePools) {
      for (const umpire of umpirePool.umpires) {
        umpire.rank = umpire.competitionRank ? umpire.competitionRank.rank : null;
        umpire.poolRank = umpire.umpirePoolRank ? umpire.umpirePoolRank.rank : null;
        delete umpire.umpireCompetitionRank;
        delete umpire.umpirePoolRank;
      }
    }

    if (
      !!competitionOrganisation &&
      CompetitionParticipatingTypeEnum.PARTICIPATED_IN ===
        (await this.competitionOrganisationService.getCompetitionParticipatingType(
          competitionId,
          organisationId,
        ))
    ) {
      for (const umpirePool of umpirePools) {
        const filteredUmpires = [];
        for (const umpire of umpirePool.umpires) {
          if (
            await this.userService.isCompetitionOrganisationUmpire(
              competitionOrganisation.id,
              umpire.id,
            )
          ) {
            filteredUmpires.push(umpire);
          }
        }
        umpirePool.umpires = filteredUmpires;
      }
    }
    return umpirePools;
  }

  protected async setUmpires(
    competitionOrganisationId: number,
    umpireIds: User[],
  ): Promise<User[]> {
    return await Promise.all(
      umpireIds.map(umpireId => this.entityManager.findOneOrFail(User, umpireId)),
    );
  }

  async updateUmpireAllocation(
    competitionId: number,
    body: UmpirePoolsAllocationUpdateDto,
  ): Promise<UmpirePool[]> {
    const umpirePools = [];
    for (const umpirePoolId in body.umpirePools) {
      const divisions = body.umpirePools[umpirePoolId];

      const umpirePool = await this.entityManager.findOneOrFail(UmpirePool, {
        where: {
          id: umpirePoolId,
          competitionId: competitionId,
        },
      });

      umpirePool.divisions = await Promise.all(
        divisions.map(divisionId => this.entityManager.findOneOrFail(Division, divisionId)),
      );

      umpirePools.push(await this.entityManager.save(umpirePool));
    }

    return umpirePools;
  }

  async addUmpireToPool(
    organisationId: number,
    competitionId: number,
    umpirePoolId: number,
    umpireId: number,
  ): Promise<UmpirePool> {
    if (
      CompetitionParticipatingTypeEnum.PARTICIPATED_IN ===
      (await this.competitionOrganisationService.getCompetitionParticipatingType(
        competitionId,
        organisationId,
      ))
    ) {
      throw new ForbiddenError("Participated-in organization can't update pools!");
    }

    const umpirePool = await this.entityManager.findOneOrFail(UmpirePool, umpirePoolId);
    const umpire = await this.umpireService.findOneByUserId(umpireId);

    if (!umpirePool.umpires.filter(item => umpire.id === item.id).length) {
      umpirePool.umpires.push(umpire);
    }

    return await this.entityManager.save(umpirePool);
  }

  retrievePoolUmpireId(umpire: User): number;
  retrievePoolUmpireId(umpire: number): number;

  retrievePoolUmpireId(umpire: any): number {
    if (Number.isInteger(umpire)) {
      return umpire as number;
    }

    return umpire.id;
  }
}

interface RawUmpireRank {
  id: number;
  rank: number;
}
