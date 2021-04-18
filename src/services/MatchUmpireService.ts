import { Inject, Service } from 'typedi';
import BaseService from './BaseService';
import { MatchUmpire } from '../models/MatchUmpire';
import { UserRoleEntity } from '../models/security/UserRoleEntity';
import { DeleteResult } from 'typeorm-plus';
import { RequestFilter } from '../models/RequestFilter';
import {
  stringTONumber,
  paginationData,
  isNotNullAndUndefined,
  isArrayPopulated,
} from '../utils/Utils';
import { Role } from '../models/security/Role';
import { UmpirePaymentSetting } from '../models/UmpirePaymentSetting';
import { UmpirePaymentFeeRate } from '../models/UmpirePaymentFeeRate';
import { UmpirePaymentFeeTypeEnum } from '../models/enums/UmpirePaymentFeeTypeEnum';
import { UmpirePool } from '../models/UmpirePool';
import * as _ from 'lodash';
import MatchService from './MatchService';
import UserService from './UserService';
import RosterService from './RosterService';
import UserDeviceService from './UserDeviceService';
import { Roster } from '../models/security/Roster';
import { StateTimezone } from '../models/StateTimezone';
import { getMatchUmpireNotificationMessage } from '../utils/NotificationMessageUtils';
import { logger } from '../logger';

@Service()
export default class MatchUmpireService extends BaseService<MatchUmpire> {
  @Inject()
  matchService: MatchService;

  @Inject()
  userService: UserService;

  @Inject()
  rosterService: RosterService;

  @Inject()
  deviceService: UserDeviceService;

  modelName(): string {
    return MatchUmpire.name;
  }

  public async findByMatchIds(matchIds: number[]): Promise<MatchUmpire[]> {
    return this.entityManager
      .createQueryBuilder(MatchUmpire, 'matchUmpire')
      .leftJoinAndSelect(
        'matchUmpire.linkedCompetitionOrganisation',
        'linkedCompetitionOrganisation',
      )
      .leftJoinAndSelect('matchUmpire.user', 'user')
      .where('matchUmpire.matchId in (:matchIds)', { matchIds })
      .orderBy('matchUmpire.matchId')
      .addOrderBy('matchUmpire.sequence')
      .getMany();
  }

  public async findByCompetitionId(
    competitionid: number,
    requestFilter: RequestFilter,
  ): Promise<any> {
    let query = this.entityManager.createQueryBuilder(MatchUmpire, 'matchUmpire');
    query
      .leftJoinAndSelect(
        'matchUmpire.linkedCompetitionOrganisation',
        'linkedCompetitionOrganisation',
      )
      .leftJoinAndSelect('matchUmpire.user', 'user')
      .leftJoinAndSelect('matchUmpire.match', 'match')
      .leftJoinAndSelect('match.team1', 'team1')
      .leftJoinAndSelect('match.team2', 'team2')
      .where('match.competitionId = :competitionid', { competitionid })
      .orderBy('matchUmpire.matchId')
      .addOrderBy('matchUmpire.sequence')
      .getMany();

    const matchCount = await query.getCount();
    const result = await query
      .skip(requestFilter.paging.offset)
      .take(requestFilter.paging.limit)
      .getMany();
    return { matchCount, result };
  }

  public async deleteByMatchId(matchId: number): Promise<DeleteResult> {
    return this.entityManager
      .createQueryBuilder()
      .delete()
      .from(MatchUmpire)
      .andWhere('matchId = :matchId', { matchId })
      .execute();
  }

  public async findByRosterAndCompetition(
    organisationId: number,
    competitionId: number,
    matchId: number,
    divisionId: number,
    venueId: number,
    roundIds: number[],
    requestFilter: RequestFilter,
    sortBy: string = undefined,
    sortOrder: 'ASC' | 'DESC' = undefined,
  ): Promise<any> {
    let limit = 50000;
    let offset = 0;
    if (
      requestFilter &&
      isNotNullAndUndefined(requestFilter) &&
      isNotNullAndUndefined(requestFilter.paging) &&
      isNotNullAndUndefined(requestFilter.paging.limit) &&
      isNotNullAndUndefined(requestFilter.paging.offset)
    ) {
      limit = requestFilter.paging.limit;
      offset = requestFilter.paging.offset;
    }

    let roundString = roundIds ? roundIds.join(',') : '-1';
    let result = await this.entityManager.query(
      'call wsa.usp_get_umpires(?,?,?,?,?,?,?,?,?,?,?,?)',
      [
        organisationId,
        competitionId,
        matchId,
        divisionId,
        venueId,
        roundString,
        limit,
        offset,
        sortBy,
        sortOrder,
        Role.UMPIRE_RESERVE,
        Role.UMPIRE_COACH,
      ],
    );

    if (result != null) {
      let totalCount = result[1] && result[1].find(x => x) ? result[1].find(x => x).totalCount : 0;
      let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
      const matches = result[0] as RawMatch[];
      for (const match of matches) {
        if (match.umpires) {
          match.umpires = _.uniqBy(match.umpires, 'rosterId');
          for (const umpire of match.umpires) {
            if (umpire.competitionOrganisations) {
              umpire.competitionOrganisations = this.sanitizeCompetitionOrgs(
                umpire.competitionOrganisations,
              );
            }
          }
        }
        if (match.umpireReserves) {
          match.umpireReserves = _.uniqBy(match.umpireReserves, 'rosterId');
          for (const umpireReserve of match.umpireReserves) {
            if (umpireReserve.competitionOrganisations) {
              umpireReserve.competitionOrganisations = this.sanitizeCompetitionOrgs(
                umpireReserve.competitionOrganisations,
              );
            }
          }
        }
        if (match.umpireCoaches) {
          match.umpireCoaches = _.uniqBy(match.umpireCoaches, 'rosterId');
          for (const umpireCoach of match.umpireCoaches) {
            if (umpireCoach.competitionOrganisations) {
              umpireCoach.competitionOrganisations = this.sanitizeCompetitionOrgs(
                umpireCoach.competitionOrganisations,
              );
            }
          }
        }
      }
      responseObject['results'] = result[0];
      let locationId = result[2] && result[2].find(y => y) ? result[2].find(y => y).locationId : 0;
      responseObject['locationId'] = locationId;

      return responseObject;
    } else {
      return [];
    }
  }

  public async deleteByParms(matchId: number, userId: number): Promise<DeleteResult> {
    return this.entityManager
      .createQueryBuilder()
      .delete()
      .from(MatchUmpire)
      .andWhere('matchId = :matchId', { matchId })
      .andWhere('userId = :userId', { userId })
      .execute();
  }

  public async getUmpirePayments(
    competitionId: number,
    competitionOrganisationId: number,
    requestFilter: RequestFilter,
    search: string,
    sortBy: string,
    orderBy: 'ASC' | 'DESC',
  ): Promise<any> {
    const matchStatus = 'ENDED';
    const umpireType = 'USERS';
    let query = this.entityManager.createQueryBuilder(MatchUmpire, 'matchUmpire');
    query
      .leftJoinAndSelect('matchUmpire.match', 'match')
      .leftJoinAndSelect('match.competition', 'competition')
      .leftJoinAndSelect('matchUmpire.user', 'user')
      .leftJoinAndSelect('matchUmpire.approvedByUser', 'approvedByUser')
      .leftJoin('competition.linkedCompetitionOrganisation', 'lco');

    if (isNotNullAndUndefined(competitionId)) {
      query.andWhere('match.competitionId = :competitionId', { competitionId });
    }
    if (isNotNullAndUndefined(competitionOrganisationId)) {
      query.andWhere(
        '(matchUmpire.competitionOrganisationId = :compOrgId or ' + 'lco.id = :compOrgId)',
        {
          compOrgId: competitionOrganisationId,
        },
      );
    }

    query
      .andWhere('matchUmpire.umpireType = :umpireType', { umpireType })
      .andWhere('match.matchStatus = :matchStatus', { matchStatus })
      .andWhere('lco.competitionId = competition.id');

    if (search !== null && search !== undefined && search !== '') {
      query.andWhere(' lower(concat_ws(" ", user.firstName, user.lastName)) like :search ', {
        search: `%${search.toLowerCase()}%`,
      });
    }

    if (isNotNullAndUndefined(sortBy) && isNotNullAndUndefined(orderBy) && sortBy !== '') {
      if (sortBy == 'firstName') {
        query.orderBy('user.firstName', orderBy);
      } else if (sortBy == 'lastName') {
        query.orderBy('user.lastName', orderBy);
      } else if (sortBy == 'matchId') {
        query.orderBy('match.id', orderBy);
      } else if (sortBy == 'verifiedBy') {
        query.orderBy('matchUmpire.verifiedBy', orderBy);
      } else if (sortBy == 'makePayment') {
        query.orderBy('matchUmpire.paymentStatus', orderBy);
      } else if (sortBy == 'approved_at') {
        query.orderBy('matchUmpire.approved_at', orderBy);
      } else if (sortBy == 'approvedByUser') {
        query.orderBy('approvedByUser.firstName', orderBy);
      }
    }

    const matchCount = await query.getCount();
    let result = [];
    if (
      isNotNullAndUndefined(requestFilter.paging.offset) &&
      isNotNullAndUndefined(requestFilter.paging.limit)
    ) {
      result = await query
        .skip(requestFilter.paging.offset)
        .take(requestFilter.paging.limit)
        .getMany();
    } else {
      result = await query.getMany();
    }
    return { matchCount, result };
  }

  public async calculatePaymentForUmpire(
    matchUmpireId: number,
    organisationId: number,
  ): Promise<number> {
    const matchUmpire = await this.entityManager
      .createQueryBuilder(MatchUmpire, 'matchUmpire')
      .leftJoinAndSelect('matchUmpire.match', 'match')
      .where('matchUmpire.id = :matchUmpireId', { matchUmpireId })
      .getOne();

    const { competitionId } = matchUmpire.match || {};

    if (!competitionId) {
      return null;
    }

    const userRoleEntity = await this.entityManager
      .createQueryBuilder(UserRoleEntity, 'userRoleEntity')
      .leftJoinAndSelect('userRoleEntity.user', 'user')
      .where('userRoleEntity.entityTypeId = 1')
      .andWhere('userRoleEntity.entityId = :entityId', { entityId: competitionId })
      .andWhere('userRoleEntity.userId = :userId', { userId: matchUmpire.userId })
      .andWhere('userRoleEntity.roleId in (:roleIds)', { roleIds: [15, 19, 20] })
      .getOne();

    const { roleId, user } = userRoleEntity;
    let umpireBadgeId;
    if (roleId === Role.UMPIRE || roleId === Role.UMPIRE_RESERVE) {
      umpireBadgeId = user.accreditationLevelUmpireRefId;
    }

    if (roleId === Role.UMPIRE_COACH) {
      umpireBadgeId = user.accreditationLevelCoachRefId;
    }

    const paymentSetting = await this.entityManager
      .createQueryBuilder(UmpirePaymentSetting, 'paymentSetting')
      .where('paymentSetting.competitionId = :competitionId', { competitionId })
      .andWhere('paymentSetting.organisationId = :organisationId', { organisationId })
      .getOne();

    const { UmpirePaymentFeeType } = paymentSetting;

    let paymentFeeQuery = this.entityManager.createQueryBuilder(
      UmpirePaymentFeeRate,
      'paymentFeeRate',
    );
    switch (UmpirePaymentFeeType) {
      case UmpirePaymentFeeTypeEnum.BY_BADGE:
        paymentFeeQuery
          .leftJoin('paymentFeeRate.umpirePaymentFeeByBadge', 'umpirePaymentFeeByBadge')
          .where('umpirePaymentFeeByBadge.accreditationUmpireRefId = :umpireBadgeId', {
            umpireBadgeId,
          })
          .andWhere('umpirePaymentFeeByBadge.umpirePaymentSettingId = :paymentSettingId', {
            paymentSettingId: paymentSetting.id,
          })
          .andWhere('roleId = :roleId', { roleId });
        break;
      case UmpirePaymentFeeTypeEnum.BY_POOL:
        const pool = await this.entityManager
          .createQueryBuilder(UmpirePool, 'umpirePool')
          .leftJoinAndSelect('umpirePool.umpires', 'umpires')
          .leftJoinAndSelect('umpirePool.divisions', 'divisions')
          .leftJoinAndSelect('divisions.matches', 'matches')
          .where('matches.id = :matchId', { matchId: matchUmpire.match.id })
          .andWhere('umpires.id = :umpireId', { umpireId: matchUmpire.userId })
          .getOne();

        if (!pool) {
          return null;
        }

        paymentFeeQuery
          .leftJoinAndSelect('paymentFeeRate.umpirePaymentFeeByPool', 'umpByPool')
          .where('umpByPool.umpirePoolId = :umpirePoolId', { umpirePoolId: pool.id })
          .andWhere('roleId = :roleId', { roleId });
    }

    const umpirePaymentFeeRate = await paymentFeeQuery.getOne();

    return umpirePaymentFeeRate?.rate ?? null;
  }

  protected sanitizeCompetitionOrgs(
    compOrgs: RawCompetitionOrganisation[],
  ): RawCompetitionOrganisation[] {
    let sanitizedCompOrgs = compOrgs.filter(compOrg => {
      return compOrg.id && compOrg.name;
    });
    sanitizedCompOrgs = _.uniqBy(sanitizedCompOrgs, 'name');

    return sanitizedCompOrgs;
  }

  public async attachUmpireToMatch(matchId: number, matchUmpires: MatchUmpire[]): Promise<void> {
    let umpireWithDetailsList = await this.findByMatchIds([matchId]);
    const promises = matchUmpires.map(async matchUmpire => {
      const ifAbleToAssign = await this.matchService.checkIfAbleToAssignUmpireToMath(
        matchId,
        matchUmpire.userId,
      );
      if (ifAbleToAssign) {
        if (isNotNullAndUndefined(matchUmpire.userId)) {
          if (isArrayPopulated(umpireWithDetailsList)) {
            let existingUmpire = umpireWithDetailsList.find(
              u => u.sequence == matchUmpire.sequence,
            );

            let updatedUmpire = new MatchUmpire();
            updatedUmpire.id = matchUmpire.id;
            updatedUmpire.matchId = matchId;
            updatedUmpire.userId = matchUmpire.userId;
            updatedUmpire.competitionOrganisationId = matchUmpire.competitionOrganisationId;
            updatedUmpire.umpireName = matchUmpire.umpireName;
            updatedUmpire.umpireType = matchUmpire.umpireType;
            updatedUmpire.sequence = matchUmpire.sequence;
            updatedUmpire.createdBy = matchUmpire.createdBy;
            updatedUmpire.verifiedBy = matchUmpire.verifiedBy;

            let savedUmpire = await this.createOrUpdate(updatedUmpire);
            await this.updateUmpireRosters(existingUmpire, savedUmpire, true);
            return savedUmpire;
          } else {
            return await this.createUmpire(matchUmpire, true, umpireWithDetailsList);
          }
        } else {
          return await this.createUmpire(matchUmpire, true, umpireWithDetailsList);
        }
      }
    });

    const promisedUmpires = (await Promise.all(promises)).filter(umpire => !!umpire);
    const rosters = await this.rosterService.findAllRostersByParams(Role.UMPIRE, matchId);

    if (isArrayPopulated(promisedUmpires) && isArrayPopulated(rosters)) {
      for (const roster of rosters) {
        let mu = promisedUmpires.filter(matchUmpire => matchUmpire.userId == roster.userId)[0];
        if (isNotNullAndUndefined(mu)) {
          mu.roster = roster;
        }
      }
    }
  }

  private async createUmpire(
    umpire: MatchUmpire,
    rosterLocked: boolean,
    exisitngUmpires: MatchUmpire[],
  ): Promise<MatchUmpire> {
    /// While creating umpire we will be checking if we already have one
    /// existing umpire with same userId for the match. If we found one
    /// then we will remove that first and then create a new one with the
    /// data provided.
    if (isNotNullAndUndefined(exisitngUmpires)) {
      for (let mu of exisitngUmpires) {
        if (mu.userId == umpire.userId && isNotNullAndUndefined(mu.id)) {
          await this.deleteById(mu.id);
          await this.rosterService.deleteByParams(Role.UMPIRE, mu.userId, mu.matchId);
        }
      }
    }

    let newUmpire = new MatchUmpire();
    newUmpire.matchId = umpire.matchId;
    newUmpire.userId = umpire.userId;
    newUmpire.competitionOrganisationId = umpire.competitionOrganisationId;
    newUmpire.umpireName = umpire.umpireName;
    newUmpire.umpireType = umpire.umpireType;
    newUmpire.sequence = umpire.sequence;
    newUmpire.createdBy = umpire.createdBy;
    newUmpire.verifiedBy = umpire.verifiedBy;

    let savedUmpire = await this.createOrUpdate(newUmpire);
    await this.createUmpireRosters(savedUmpire, rosterLocked);

    let tokens = (await this.deviceService.findScorerDeviceFromRoster(umpire.matchId)).map(
      device => device.deviceId,
    );
    if (tokens && tokens.length > 0) {
      this.firebaseService.sendMessageChunked({
        tokens: tokens,
        data: {
          type: 'match_umpires_added',
          matchId: umpire.matchId.toString(),
        },
      });
    }

    return savedUmpire;
  }

  private async createUmpireRosters(umpire: MatchUmpire, rosterLocked: boolean) {
    if (umpire.umpireType == 'USERS' && umpire.userId) {
      await this.umpireAddRoster(
        Role.UMPIRE,
        umpire.matchId,
        umpire.userId,
        umpire.umpireName,
        rosterLocked,
        umpire.sequence,
      );
    }
  }

  protected async umpireAddRoster(
    roleId: number,
    matchId: number,
    userId: number,
    userName: String,
    rosterLocked: boolean,
    sequence: number,
    rosterStatus: 'YES' | 'NO' | 'LATER' | 'MAYBE' = undefined,
  ) {
    if (roleId != Role.UMPIRE && roleId != Role.UMPIRE_RESERVE && roleId != Role.UMPIRE_COACH) {
      throw 'Got wrong roleId for umpire add roster';
    }

    let match = await this.matchService.findMatchById(matchId);

    let umpireRoster = new Roster();
    umpireRoster.roleId = roleId;
    umpireRoster.matchId = matchId;
    umpireRoster.userId = userId;
    if (isNotNullAndUndefined(rosterLocked) && rosterLocked) {
      umpireRoster.locked = rosterLocked;
      umpireRoster.status = 'YES';
    } else if (
      isNotNullAndUndefined(rosterStatus) &&
      (rosterStatus == 'YES' || rosterStatus == 'NO')
    ) {
      umpireRoster.status = rosterStatus;
    }
    if (sequence == 1) {
      umpireRoster.additionalInfo = {
        FIRST_UMPIRE_OR_REFEREE: true,
      };
    }
    let savedRoster = await this.rosterService.createOrUpdate(umpireRoster);
    if (savedRoster) {
      let tokens = (await this.deviceService.getUserDevices(umpireRoster.userId)).map(
        device => device.deviceId,
      );
      if (tokens && tokens.length > 0) {
        try {
          var locationRefId;
          if (
            isNotNullAndUndefined(match) &&
            isNotNullAndUndefined(match.venueCourt) &&
            isNotNullAndUndefined(match.venueCourt.venue) &&
            isNotNullAndUndefined(match.venueCourt.venue.stateRefId)
          ) {
            locationRefId = match.venueCourt.venue.stateRefId;
          } else if (
            isNotNullAndUndefined(match.competition) &&
            isNotNullAndUndefined(match.competition.location) &&
            isNotNullAndUndefined(match.competition.location.id)
          ) {
            locationRefId = match.competition.location.id;
          }

          if (isNotNullAndUndefined(locationRefId)) {
            let stateTimezone: StateTimezone = await this.matchService.getMatchTimezone(
              locationRefId,
            );
            let messageBody: String = getMatchUmpireNotificationMessage(
              match,
              stateTimezone,
              rosterLocked,
            );

            this.firebaseService.sendMessageChunked({
              tokens: tokens,
              title: `Hi ${userName}`,
              body: messageBody,
              data: {
                type: 'add_umpire_match',
                matchId: savedRoster.matchId.toString(),
                rosterId: savedRoster.id.toString(),
              },
            });
          }
        } catch (e) {
          logger.error(`Failed to send notification to umpire with error -`, e);
        }
      }
    }
  }

  private async updateUmpireRosters(
    oldUmpire: MatchUmpire,
    newUmpire: MatchUmpire,
    rosterLocked: boolean,
  ) {
    let umpireRole = await this.userService.getRole('umpire');

    if (oldUmpire.userId == null && newUmpire.umpireType == 'USERS') {
      // Creating new roster for umpire as new user assigned
      await this.umpireAddRoster(
        Role.UMPIRE,
        newUmpire.matchId,
        newUmpire.userId,
        newUmpire.umpireName,
        rosterLocked,
        newUmpire.sequence,
      );
    } else if (oldUmpire.userId && newUmpire.userId && oldUmpire.userId != newUmpire.userId) {
      // A umpire slot got updated to a new user
      // Removing old roster
      await this.umpireRemoveRoster(Role.UMPIRE, oldUmpire.userId, oldUmpire.matchId);
      // Creating new roster
      await this.umpireAddRoster(
        Role.UMPIRE,
        newUmpire.matchId,
        newUmpire.userId,
        newUmpire.umpireName,
        rosterLocked,
        newUmpire.sequence,
      );
    } else if (oldUmpire.userId && newUmpire.userId == null) {
      // A umpire got removed
      await this.umpireRemoveRoster(Role.UMPIRE, oldUmpire.userId, oldUmpire.matchId);
    }
  }

  protected async umpireRemoveRoster(roleId: number, userId: number, matchId: number) {
    if (roleId != Role.UMPIRE && roleId != Role.UMPIRE_RESERVE && roleId != Role.UMPIRE_COACH) {
      throw 'Got wrong roleId for umpire remove roster';
    }

    let roster = await this.rosterService.findByParams(roleId, userId, matchId);
    if (roster) {
      const rosterId = roster.id;
      let result = await this.rosterService.deleteById(rosterId);
      if (result) {
        let tokens = (await this.deviceService.getUserDevices(userId)).map(
          device => device.deviceId,
        );
        if (tokens && tokens.length > 0) {
          this.firebaseService.sendMessageChunked({
            tokens: tokens,
            data: {
              type: 'remove_umpire_match',
              rosterId: rosterId.toString(),
              matchId: roster.matchId.toString(),
            },
          });
        }
      }
    }
  }
}

type RawMatch = {
  umpireCoaches: RawUmpire[];
  umpireReserves: RawUmpire[];
  umpires: RawUmpire[];
};

type RawUmpire = {
  competitionOrganisations: RawCompetitionOrganisation[];
};

type RawCompetitionOrganisation = {
  id: number;
  name: string;
};
