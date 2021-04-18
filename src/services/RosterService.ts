import { Service } from 'typedi';
import { DeleteResult } from 'typeorm-plus';
import {
  paginationData,
  stringTONumber,
  isNotNullAndUndefined,
  isArrayPopulated,
} from '../utils/Utils';
import BaseService from './BaseService';
import { Roster } from '../models/security/Roster';
import { EntityType } from '../models/security/EntityType';
import { User } from '../models/User';
import { Match } from '../models/Match';
import { RequestFilter } from '../models/RequestFilter';
import { Role } from '../models/security/Role';

@Service()
export default class RosterService extends BaseService<Roster> {
  modelName(): string {
    return Roster.name;
  }

  public async findFullById(rosterId: number): Promise<Roster> {
    return this.entityManager
      .createQueryBuilder(Roster, 'roster')
      .leftJoinAndSelect('roster.match', 'match')
      .leftJoinAndSelect('match.team1', 'team1')
      .leftJoinAndSelect('match.team2', 'team2')
      .leftJoinAndSelect('match.venueCourt', 'venueCourt')
      .leftJoinAndSelect('match.division', 'division')
      .leftJoinAndSelect('match.competition', 'competition')
      .leftJoinAndSelect('match.matchPausedTimes', 'matchPausedTimes')
      .leftJoinAndSelect('competition.location', 'location')
      .leftJoinAndSelect('venueCourt.venue', 'venue')
      .leftJoinAndSelect('roster.eventOccurrence', 'eo')
      .leftJoinAndSelect('eo.event', 'e')
      .andWhere('roster.id = :rosterId', { rosterId })
      .andWhere('match.deleted_at is null')
      .getOne();
  }

  public async findByUser(userId: number): Promise<Roster[]> {
    return this.entityManager
      .createQueryBuilder(Roster, 'roster')
      .innerJoinAndSelect('roster.match', 'match')
      .innerJoinAndSelect('match.team1', 'team1')
      .innerJoinAndSelect('match.team2', 'team2')
      .innerJoinAndSelect('match.venueCourt', 'venueCourt')
      .innerJoinAndSelect('match.division', 'division')
      .innerJoinAndSelect('match.competition', 'competition')
      .leftJoinAndSelect('match.matchPausedTimes', 'matchPausedTimes')
      .leftJoinAndSelect('competition.location', 'location')
      .leftJoinAndSelect('venueCourt.venue', 'venue')
      .andWhere('roster.userId = :userId', { userId })
      .andWhere(
        '(match.matchStatus is null or ' +
          '(match.matchStatus != :status or ' +
          'match.matchAction = :verifyScores or ' +
          'match.matchAction = :verifyActonLogs or ' +
          'match.matchAction = :sendOffReport' +
          '))',
        {
          status: 'ENDED',
          verifyScores: 'VERIFY_SCORES',
          verifyActonLogs: 'VERIFY_ACTION_LOGS',
          sendOffReport: 'SEND_OFF_REPORT',
        },
      )
      .andWhere('match.deleted_at is null')
      .getMany();
  }

  public async findRosterEventByUser(userId: number): Promise<Roster[]> {
    return this.entityManager
      .createQueryBuilder(Roster, 'roster')
      .innerJoinAndSelect('roster.eventOccurrence', 'eo')
      .innerJoinAndSelect('eo.event', 'e')
      .andWhere('eo.deleted_at is null')
      .andWhere('roster.userId = :userId', { userId })
      .getMany();
  }

  public async findByMatchIds(matchId: number[]): Promise<Roster[]> {
    return this.entityManager
      .createQueryBuilder(Roster, 'roster')
      .innerJoinAndSelect('roster.match', 'match')
      .innerJoinAndSelect('match.team1', 'team1')
      .innerJoinAndSelect('match.team2', 'team2')
      .innerJoinAndSelect('match.venueCourt', 'venueCourt')
      .innerJoinAndSelect('match.division', 'division')
      .innerJoinAndSelect('match.competition', 'competition')
      .leftJoinAndSelect('match.matchPausedTimes', 'matchPausedTimes')
      .leftJoinAndSelect('competition.location', 'location')
      .leftJoinAndSelect('venueCourt.venue', 'venue')
      .andWhere('roster.matchId in (:matchId)', { matchId })
      .andWhere('match.deleted_at is null')
      .andWhere('roster.userId != 0')
      .getMany();
  }

  // keeping the query as light as possible but more fields can be added if needed - used for umpire roster list
  public async findUserRostersByCompetition(
    entityId: number,
    entityTypeId: number,
    roleIds: number[],
    status: string,
    requestFilter: RequestFilter,
    sortBy: string = undefined,
    sortOrder: 'ASC' | 'DESC' = undefined,
  ): Promise<any> {
    let ureRoleIds = [];
    Array.prototype.push.apply(ureRoleIds, roleIds);
    if (roleIds.indexOf(Role.UMPIRE_RESERVE) >= 0 && roleIds.indexOf(Role.UMPIRE) < 0) {
      ureRoleIds.push(Role.UMPIRE);
    }

    let query = this.entityManager
      .createQueryBuilder(Roster, 'roster')
      .innerJoinAndSelect('roster.match', 'match')
      .innerJoinAndSelect('match.venueCourt', 'venueCourt')
      .innerJoinAndSelect('roster.user', 'user')
      .innerJoinAndSelect('match.competition', 'competition')
      .innerJoinAndSelect('user.userRoleEntities', 'ure', 'ure.roleId in (:ids)', {
        ids: ureRoleIds,
      })
      .leftJoinAndSelect('venueCourt.venue', 'venue');

    if (entityTypeId == EntityType.COMPETITION_ORGANISATION) {
      query
        .innerJoinAndSelect('ure.linkedCompetitionOrganisation', 'lco', 'lco.id = :compOrgId', {
          compOrgId: entityId,
        })
        .andWhere('match.competitionId = lco.competitionId');
    } else if (entityTypeId == EntityType.COMPETITION) {
      query
        .innerJoinAndSelect(
          'ure.linkedCompetitionOrganisation',
          'lco',
          'lco.competitionId = :compId',
          {
            compId: entityId,
          },
        )
        .andWhere('match.competitionId = :competitionId', {
          competitionId: entityId,
        });
    }

    query.andWhere('roster.roleId in (:roleIds)', { roleIds }).andWhere('match.deleted_at is null');

    if (status) {
      if (status == Roster.STATUS_NONE) {
        query.andWhere('roster.status is null');
      } else {
        query.andWhere('roster.status = :status', { status });
      }
    }

    if (sortBy) {
      if (sortBy === 'organisation') {
        query.orderBy('lco.name', sortOrder);
      } else if (sortBy === 'firstName') {
        query.orderBy('user.firstName', sortOrder);
      } else if (sortBy === 'lastName') {
        query.orderBy('user.lastName', sortOrder);
      } else if (sortBy === 'matchId') {
        query.orderBy('match_id', sortOrder);
      } else if (sortBy === 'startTime') {
        query.orderBy('match_startTime', sortOrder);
      } else if (sortBy === 'status') {
        query.orderBy('roster.status', sortOrder);
      }
    }

    if (
      isNotNullAndUndefined(requestFilter) &&
      isNotNullAndUndefined(requestFilter.paging) &&
      isNotNullAndUndefined(requestFilter.paging.limit) &&
      isNotNullAndUndefined(requestFilter.paging.offset)
    ) {
      const result = await query
        .skip(requestFilter.paging.offset)
        .take(requestFilter.paging.limit)
        .getMany();
      let totalCount = await query.getCount();
      let responseObject = paginationData(
        totalCount,
        requestFilter.paging.limit,
        requestFilter.paging.offset,
      );
      responseObject['results'] = result;
      return responseObject;
    } else {
      let responseObject = paginationData(null, null, null);
      responseObject['results'] = await query.getMany();
      return responseObject;
    }
  }

  public async findRosterId(rosterId: number): Promise<Roster> {
    return this.entityManager
      .createQueryBuilder(Roster, 'roster')
      .innerJoinAndSelect('roster.match', 'match')
      .leftJoinAndSelect('match.matchPausedTimes', 'matchPausedTimes')
      .andWhere('roster.id = :rosterId', { rosterId })
      .andWhere('match.deleted_at is null')
      .getOne();
  }

  // to allow inline edit of rosters
  public async findAdminRosterId(rosterId: number): Promise<any> {
    let query = this.entityManager
      .createQueryBuilder(Roster, 'r')
      .select([
        'distinct u.id as id',
        'u.firstName as firstName',
        'u.lastName as lastName',
        'r.id as rosterId',
        'r.status as rosterStatus',
      ])
      .innerJoin(User, 'u', '(u.id = r.userId)')
      .andWhere('r.id = :rosterId', { rosterId });
    return query.getRawOne();
  }

  public async findAllRostersByParam(matchIds: number[]): Promise<Roster[]> {
    return this.entityManager
      .createQueryBuilder(Roster, 'roster')
      .leftJoin('roster.match', 'match')
      .addSelect(['match.team1id', 'match.team2id'])
      .andWhere('match.deleted_at is null')
      .andWhere('roster.matchId in (:matchIds)', { matchIds })
      .getMany();
  }

  // to allow inline edit of rosters
  public async findByParam(rosterId: number): Promise<any> {
    let query = this.entityManager
      .createQueryBuilder(Roster, 'r')
      .select([
        'distinct u.id as id',
        'u.firstName as firstName',
        'u.lastName as lastName',
        'r.id as rosterId',
        'r.status as rosterStatus',
      ])
      .innerJoin(User, 'u', '(u.id = r.userId)')
      .andWhere('r.id = :rosterId', { rosterId });
    return query.getRawOne();
  }

  public async findUsersByRole(competitionId: number, roleId: number): Promise<User[]> {
    let query = this.entityManager
      .createQueryBuilder(User, 'u')
      .select([
        'distinct u.id as id',
        'u.email as email',
        'u.firstName as firstName',
        'u.lastName as lastName',
        'u.mobileNumber as mobileNumber',
        'u.photoUrl as photoUrl',
      ])
      .innerJoin(Roster, 'r', '(u.id = r.userId)')
      .innerJoin(Match, 'm', '(m.id = r.matchId)')
      .andWhere('m.competitionId = :competitionId', { competitionId })
      .andWhere('r.roleId = :roleId', { roleId });
    return query.getRawMany();
  }

  public async findByEntityId(
    entityTypeId: number,
    entityId: number,
    roleId: number,
    requestFilter: RequestFilter,
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC',
  ): Promise<any> {
    let result = await this.entityManager.query(
      'call wsa.usp_get_team_rosters(?,?,?,?,?,?,?,?,?,?)',
      [
        entityTypeId,
        entityId,
        roleId,
        requestFilter.paging.limit,
        requestFilter.paging.offset,
        requestFilter.search,
        sortBy,
        sortOrder,
        EntityType.COMPETITION,
        EntityType.COMPETITION_ORGANISATION,
      ],
    );
    if (result != null) {
      let totalCount = result[0].length;
      let responseObject = paginationData(
        stringTONumber(totalCount),
        requestFilter.paging.limit,
        requestFilter.paging.offset,
      );
      responseObject['users'] = result[0];
      return responseObject;
    } else {
      return [];
    }
  }

  public async findByEventOccurrence(eventOccurrenceId: number): Promise<Roster[]> {
    return this.entityManager
      .createQueryBuilder(Roster, 'r')
      .andWhere('r.eventOccurrenceId = :id', { id: eventOccurrenceId })
      .getMany();
  }

  public async findByParams(roleId: number, userId: number, matchId: number): Promise<Roster> {
    return this.entityManager
      .createQueryBuilder(Roster, 'r')
      .andWhere('r.roleId = :roleId', { roleId })
      .andWhere('r.userId = :userId', { userId })
      .andWhere('r.matchId = :matchId', { matchId })
      .getOne();
  }

  public async deleteByParams(
    roleId: number,
    userId: number,
    matchId: number,
  ): Promise<DeleteResult> {
    return this.entityManager
      .createQueryBuilder()
      .delete()
      .from(Roster, 'r')
      .andWhere('roleId = :roleId', { roleId })
      .andWhere('userId = :userId', { userId })
      .andWhere('matchId = :matchId', { matchId })
      .execute();
  }

  public async findAllRostersByParams(roleId: number, matchId: number): Promise<Roster[]> {
    return this.entityManager
      .createQueryBuilder(Roster, 'r')
      .andWhere('r.roleId = :roleId', { roleId })
      .andWhere('r.matchId = :matchId', { matchId })
      .getMany();
  }

  public async getRosterStatus(roleId: number, teamId: number, matchId: number): Promise<Roster> {
    return this.entityManager
      .createQueryBuilder(Roster, 'r')
      .andWhere('r.roleId = :roleId', { roleId })
      .andWhere('r.teamId = :teamId', { teamId })
      .andWhere('r.matchId = :matchId', { matchId })
      .getOne();
  }

  public async deleteByEventOccurrence(eventOccurrenceId: number): Promise<DeleteResult> {
    return this.entityManager
      .createQueryBuilder()
      .delete()
      .from(Roster, 'roster')
      .where('eventOccurrenceId = :eventOccurrenceId', { eventOccurrenceId })
      .execute();
  }

  public async findByEventOccurrenceIds(ids: number[]): Promise<Roster[]> {
    return this.entityManager
      .createQueryBuilder(Roster, 'r')
      .andWhere('r.eventOccurrenceId in (:ids)', { ids: ids })
      .getMany();
  }

  public async deleteByEventOccurrenceIds(ids: number[]): Promise<DeleteResult> {
    return this.entityManager
      .createQueryBuilder()
      .delete()
      .from(Roster, 'roster')
      .where('eventOccurrenceId in (:ids)', { ids: ids })
      .execute();
  }

  public async findFutureUserRostersForRole(
    userId: number,
    roleId: number,
    entityId: number,
    entityTypeId: number,
  ): Promise<Roster[]> {
    let query = this.entityManager
      .createQueryBuilder(Roster, 'roster')
      .innerJoinAndSelect('roster.match', 'match')
      .innerJoinAndSelect('match.team1', 'team1')
      .innerJoinAndSelect('match.team2', 'team2')
      .where('match.deleted_at is null')
      .andWhere('match.startTime > :currentTime', { currentTime: new Date() })
      .andWhere('roster.userId = :userId', { userId })
      .andWhere('roster.matchId is not null')
      .andWhere('roster.eventOccurrenceId is null');

    if (roleId) {
      query.andWhere('roster.roleId = :roleId', { roleId });
    }
    if (entityTypeId == EntityType.COMPETITION) {
      query.andWhere('match.competitionId = :compId', { compId: entityId });
    } else if (entityTypeId == EntityType.COMPETITION_ORGANISATION && entityId != 0) {
      query.andWhere(
        'team1.competitionOrganisationId = :compOrgId OR ' +
          'team2.competitionOrganisationId = :compOrgId',
        { compOrgId: entityId },
      );
    }

    return query.getMany();
  }

  public async umpireActivity(
    userId: number,
    roleIds: number[],
    requestFilter: RequestFilter,
    sortBy: string = undefined,
    sortOrder: 'ASC' | 'DESC' = undefined,
  ): Promise<any> {
    let query = this.entityManager
      .createQueryBuilder(Roster, 'roster')
      .innerJoinAndSelect('roster.match', 'match')
      .innerJoinAndSelect('roster.user', 'user')
      .innerJoinAndSelect('match.competition', 'competition')
      .leftJoinAndSelect('match.team1', 'team1')
      .leftJoinAndSelect('match.team2', 'team2')
      .innerJoinAndSelect('user.userRoleEntities', 'ure', 'ure.roleId in (:ids)', { ids: roleIds })
      .innerJoinAndSelect('ure.linkedCompetitionOrganisation', 'lco')
      .andWhere('roster.roleId in (:roleIds)', { roleIds })
      .andWhere('user.id = :userId', { userId })
      .andWhere('match.deleted_at is null');

    //sortBy is not implemented on status and amount column as it is to be linked later
    if (sortBy) {
      if (sortBy === 'competition') {
        query.orderBy('competition.longName', sortOrder);
      } else if (sortBy === 'matchId') {
        query.orderBy('match.id', sortOrder);
      } else if (sortBy === 'date') {
        query.orderBy('match.startTime', sortOrder);
      } else if (sortBy === 'affiliate') {
        query.orderBy('lco.name', sortOrder);
      } else if (sortBy === 'home') {
        query.orderBy('team1.name', sortOrder);
      } else if (sortBy === 'away') {
        query.orderBy('team2.name', sortOrder);
      }
    }

    if (
      isNotNullAndUndefined(requestFilter) &&
      isNotNullAndUndefined(requestFilter.paging) &&
      isNotNullAndUndefined(requestFilter.paging.limit) &&
      isNotNullAndUndefined(requestFilter.paging.offset)
    ) {
      const result = await query
        .skip(requestFilter.paging.offset)
        .take(requestFilter.paging.limit)
        .getMany();
      let totalCount = await query.getCount();
      let responseObject = paginationData(
        totalCount,
        requestFilter.paging.limit,
        requestFilter.paging.offset,
      );
      responseObject['results'] = result;
      return responseObject;
    } else {
      let responseObject = paginationData(null, null, null);
      responseObject['results'] = await query.getMany();
      return responseObject;
    }
  }

  public async getUmpireRostersForDates(
    umpireId: number,
    startTime: Date,
    endTime: Date,
  ): Promise<Roster[]> {
    return await this.entityManager
      .createQueryBuilder(Roster, 'ros')
      .leftJoinAndSelect(
        subQuery => {
          const query = subQuery
            .select([
              'id',
              'startTime',
              'matchDuration',
              'DATE_ADD(startTime, INTERVAL matchDuration MINUTE) AS approxEndTime',
            ])
            .from(Match, 'm');
          return query;
        },
        'overlap',
        'overlap.id = ros.matchId and ((overlap.startTime ' +
          '<= :startTime and overlap.approxEndTime > :startTime) or (overlap.startTime ' +
          '>= :startTime and overlap.startTime < :endTime))',
        {
          startTime: startTime,
          endTime: endTime,
        },
      )
      .leftJoinAndSelect('ros.match', 'match')
      .where('ros.overlap.id is not null')
      .andWhere('ros.userId = :umpireId', { umpireId })
      .getMany();
  }
}
