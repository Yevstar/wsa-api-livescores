import {Service} from "typedi";
import BaseService from "./BaseService";
import {MatchUmpire} from "../models/MatchUmpire";
import {UserRoleEntity} from "../models/security/UserRoleEntity";
import {DeleteResult} from "typeorm-plus";
import {RequestFilter} from "../models/RequestFilter";
import {stringTONumber, paginationData, isNotNullAndUndefined} from "../utils/Utils";
import {Role} from '../models/security/Role';
import {UmpirePaymentSetting} from "../models/UmpirePaymentSetting";
import {UmpirePaymentFeeRate} from "../models/UmpirePaymentFeeRate";
import {UmpirePaymentFeeTypeEnum} from "../models/enums/UmpirePaymentFeeTypeEnum";
import {UmpirePool} from "../models/UmpirePool";

@Service()
export default class MatchUmpireService extends BaseService<MatchUmpire> {

    modelName(): string {
        return MatchUmpire.name;
    }

    public async findByMatchIds(matchIds: number[]): Promise<MatchUmpire[]> {
        return this.entityManager.createQueryBuilder(MatchUmpire, 'matchUmpire')
            .leftJoinAndSelect('matchUmpire.linkedCompetitionOrganisation', 'linkedCompetitionOrganisation')
            .leftJoinAndSelect('matchUmpire.user', 'user')
            .where('matchUmpire.matchId in (:matchIds)', {matchIds})
            .orderBy('matchUmpire.matchId')
            .addOrderBy('matchUmpire.sequence')
            .getMany();
    }

    public async findByCompetitionId(competitionid: number, requestFilter: RequestFilter): Promise<any> {
        let query = this.entityManager.createQueryBuilder(MatchUmpire, 'matchUmpire');
        query.leftJoinAndSelect('matchUmpire.linkedCompetitionOrganisation', 'linkedCompetitionOrganisation')
            .leftJoinAndSelect('matchUmpire.user', 'user')
            .leftJoinAndSelect('matchUmpire.match', 'match')
            .leftJoinAndSelect('match.team1', 'team1')
            .leftJoinAndSelect('match.team2', 'team2')
            .where('match.competitionId = :competitionid', {competitionid})
            .orderBy('matchUmpire.matchId')
            .addOrderBy('matchUmpire.sequence')
            .getMany();

        const matchCount = await query.getCount();
        const result = await query.skip(requestFilter.paging.offset).take(requestFilter.paging.limit).getMany();
        return {matchCount,result}
    }

    public async deleteByMatchId(matchId: number): Promise<DeleteResult> {
        return this.entityManager.createQueryBuilder().delete().from(MatchUmpire)
            .andWhere("matchId = :matchId", {matchId}).execute();
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
        sortOrder: "ASC" | "DESC" = undefined
    ): Promise<any> {

        let limit = 50000;
        let offset = 0;
        if (requestFilter && isNotNullAndUndefined(requestFilter)
            && isNotNullAndUndefined(requestFilter.paging)
            && isNotNullAndUndefined(requestFilter.paging.limit)
            && isNotNullAndUndefined(requestFilter.paging.offset)) {
            limit = requestFilter.paging.limit;
            offset = requestFilter.paging.offset;
        }

        let roundString = roundIds ? roundIds.join(',') : '-1';
        let result = await this.entityManager.query("call wsa.usp_get_umpires(?,?,?,?,?,?,?,?,?,?,?,?)",
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
                Role.UMPIRE_COACH
            ]);

        if (result != null) {
            let totalCount = (result[1] && result[1].find(x=>x)) ? result[1].find(x=>x).totalCount : 0;
            let responseObject = paginationData(stringTONumber(totalCount), limit,offset);
            responseObject["results"] = result[0];
            let locationId = (result[2] && result[2].find(y=>y)) ? result[2].find(y=>y).locationId : 0;
            responseObject["locationId"] = locationId;

            return responseObject;
        } else {
            return [];
        }
    }

    public async deleteByParms(matchId: number, userId: number): Promise<DeleteResult> {
        return this.entityManager.createQueryBuilder()
            .delete()
            .from(MatchUmpire)
            .andWhere("matchId = :matchId", {matchId})
            .andWhere("userId = :userId", {userId})
            .execute();
    }

    public async getUmpirePayments(
        competitionId: number,
        competitionOrganisationId: number,
        requestFilter: RequestFilter,
        search: string,
        sortBy: string,
        orderBy: "ASC"|"DESC"
    ): Promise<any> {
        const matchStatus = 'ENDED';
        const umpireType = 'USERS';
        let query = this.entityManager.createQueryBuilder(MatchUmpire, 'matchUmpire');
        query.leftJoinAndSelect('matchUmpire.match', 'match')
            .leftJoinAndSelect('match.competition', 'competition')
            .leftJoinAndSelect('matchUmpire.user', 'user')
            .leftJoinAndSelect('matchUmpire.approvedByUser', 'approvedByUser')
            .leftJoin('competition.linkedCompetitionOrganisation', 'lco');

        if (isNotNullAndUndefined(competitionId)) {
            query.andWhere('match.competitionId = :competitionId', { competitionId });
        }
        if (isNotNullAndUndefined(competitionOrganisationId)) {
            query.andWhere('(matchUmpire.competitionOrganisationId = :compOrgId or ' +
                'lco.id = :compOrgId)', {
                compOrgId: competitionOrganisationId
            });
        }

        query.andWhere('matchUmpire.umpireType = :umpireType', { umpireType })
            .andWhere('match.matchStatus = :matchStatus', { matchStatus })
            .andWhere('lco.competitionId = competition.id');

        if (search !== null && search !== undefined && search !== '') {
            query.andWhere(' lower(concat_ws(" ", user.firstName, user.lastName)) like :search ', { search: `%${search.toLowerCase()}%` });
        }

        if (isNotNullAndUndefined(sortBy) && isNotNullAndUndefined(orderBy) && sortBy!=='') {
            if(sortBy=='firstName') {
                query.orderBy('user.firstName', orderBy)
            }else if(sortBy == 'lastName') {
                query.orderBy('user.lastName', orderBy)
            }else if(sortBy == 'matchId') {
                query.orderBy('match.id', orderBy)
            }else if(sortBy == 'verifiedBy') {
                query.orderBy('matchUmpire.verifiedBy', orderBy)
            }else if(sortBy == 'makePayment') {
                query.orderBy('matchUmpire.paymentStatus', orderBy)
            }else if(sortBy == 'approved_at') {
                query.orderBy('matchUmpire.approved_at', orderBy)
            }else if(sortBy == 'approvedByUser') {
                query.orderBy('approvedByUser.firstName', orderBy)
            }
        }

        const matchCount = await query.getCount();
        let result = [];
        if (isNotNullAndUndefined(requestFilter.paging.offset) && isNotNullAndUndefined(requestFilter.paging.limit)) {
            result = await query.skip(requestFilter.paging.offset).take(requestFilter.paging.limit).getMany();
        } else {
            result = await query.getMany();
        }
        return { matchCount, result }
    }

    public async calculatePaymentForUmpire(
        matchUmpireId: number,
        organisationId: number
    ): Promise<number> {
        const matchUmpire = await this.entityManager.createQueryBuilder(MatchUmpire, 'matchUmpire')
            .leftJoinAndSelect('matchUmpire.match', 'match')
            .where('matchUmpire.id = :matchUmpireId', {matchUmpireId})
            .getOne();

        const { competitionId } = matchUmpire.match || {};

        if (!competitionId) {
            return null;
        }

        const userRoleEntity = await this.entityManager.createQueryBuilder(UserRoleEntity, 'userRoleEntity')
            .leftJoinAndSelect('userRoleEntity.user', 'user')
            .where('userRoleEntity.entityTypeId = 1')
            .andWhere('userRoleEntity.entityId = :entityId', {entityId: competitionId})
            .andWhere('userRoleEntity.userId = :userId', {userId: matchUmpire.userId})
            .andWhere('userRoleEntity.roleId in (:roleIds)', {roleIds: [15, 19, 20]})
            .getOne();

        const { roleId, user } = userRoleEntity;
        let umpireBadgeId;
        if (roleId === Role.UMPIRE || roleId === Role.UMPIRE_RESERVE) {
            umpireBadgeId = user.accreditationLevelUmpireRefId;
        }

        if (roleId === Role.UMPIRE_COACH) {
            umpireBadgeId = user.accreditationLevelCoachRefId;
        }

        const paymentSetting = await this.entityManager.createQueryBuilder(UmpirePaymentSetting, 'paymentSetting')
            .where('paymentSetting.competitionId = :competitionId', {competitionId})
            .andWhere('paymentSetting.organisationId = :organisationId', {organisationId})
            .getOne();

        const { UmpirePaymentFeeType } = paymentSetting;

        let paymentFeeQuery = this.entityManager.createQueryBuilder(UmpirePaymentFeeRate, 'paymentFeeRate');
        switch (UmpirePaymentFeeType) {
            case UmpirePaymentFeeTypeEnum.BY_BADGE:
                paymentFeeQuery
                    .leftJoin('paymentFeeRate.umpirePaymentFeeByBadge', 'umpirePaymentFeeByBadge')
                    .where('umpirePaymentFeeByBadge.accreditationUmpireRefId = :umpireBadgeId', {umpireBadgeId})
                    .andWhere('umpirePaymentFeeByBadge.umpirePaymentSettingId = :paymentSettingId', {paymentSettingId: paymentSetting.id})
                    .andWhere('roleId = :roleId', {roleId});
                break;
            case UmpirePaymentFeeTypeEnum.BY_POOL:
                const pool = await this.entityManager.createQueryBuilder(UmpirePool, 'umpirePool')
                    .leftJoinAndSelect('umpirePool.umpires', 'umpires')
                    .leftJoinAndSelect('umpirePool.divisions', 'divisions')
                    .leftJoinAndSelect('divisions.matches', 'matches')
                    .where('matches.id = :matchId', {matchId: matchUmpire.match.id})
                    .andWhere('umpires.id = :umpireId', {umpireId: matchUmpire.userId})
                    .getOne();

                if (!pool) {
                    return null;
                }

                paymentFeeQuery
                    .leftJoinAndSelect('paymentFeeRate.umpirePaymentFeeByPool', 'umpByPool')
                    .where('umpByPool.umpirePoolId = :umpirePoolId', {umpirePoolId: pool.id})
                    .andWhere('roleId = :roleId', {roleId});
        }

        const umpirePaymentFeeRate = await paymentFeeQuery.getOne();

        return umpirePaymentFeeRate?.rate ?? null;
    }
}
