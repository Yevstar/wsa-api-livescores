import {Service} from "typedi";
import BaseService from "./BaseService";
import {Match} from "../models/Match";
import {Brackets, DeleteResult} from "typeorm-plus";
import {MatchResultType} from "../models/MatchResultType";
import {GamePosition} from "../models/GamePosition";
import {GameStat} from "../models/GameStat";
import {MatchEvent} from "../models/MatchEvent";
import {MatchPausedTime} from "../models/MatchPausedTime";
import {Lineup} from "../models/Lineup";
import {RequestFilter} from "../models/RequestFilter";
import {paginationData, stringTONumber, isNotNullAndUndefined, s3 } from "../utils/Utils";
import {StateTimezone} from "../models/StateTimezone";
import {Location} from "../models/Location";
import avro from 'avsc';

@Service()
export default class MatchService extends BaseService<Match> {

    modelName(): string {
        return Match.name;
    }

    private filterByOrganisationTeam(competitionId: number = undefined, organisationIds: number[] = [], teamIds: number[] = [], query) {
        this.addDefaultJoin(query);
        if (competitionId || (teamIds && teamIds.length > 0) || (organisationIds && organisationIds.length > 0)) {
            query.andWhere(new Brackets(qb => {
                if (competitionId) qb.orWhere("match.competitionId = :competitionId", {competitionId});
                if (teamIds && teamIds.length > 0) {
                    qb.orWhere("(match.team1Id in (:teamIds) or match.team2Id in (:teamIds))", {teamIds});
                }
                if (organisationIds && organisationIds.length > 0) {
                    qb.orWhere("(team1.organisationId in (:organisationIds) or team2.organisationId in (:organisationIds))", {organisationIds});
                }
            }));
        }
    }
    
    private addDefaultJoin(query) {
        query.innerJoinAndSelect('match.team1', 'team1')
            .innerJoinAndSelect('match.team2', 'team2')
            .innerJoinAndSelect('match.venueCourt', 'venueCourt')
            .innerJoinAndSelect('match.division', 'division')
            .innerJoinAndSelect('match.competition', 'competition')
            .leftJoinAndSelect('match.round', 'round')
            .leftJoinAndSelect('competition.location', 'location')
            .leftJoinAndSelect('competition.competitionVenues', 'competitionVenue')
            .leftJoinAndSelect('venueCourt.venue', 'venue')
            .leftJoinAndSelect('match.matchPausedTimes', 'matchPausedTimes')
            .andWhere('match.deleted_at is null');
    }

    public async findByMnb(): Promise<Match[]> {
        return this.entityManager.createQueryBuilder(Match, 'match')
            .innerJoin('match.competition', 'competition')
            .select(['match', 'competition', 'competition.mnbUser',
                'competition.mnbPassword', 'competition.mnbUrl'])
            .andWhere('match.mnbMatchId IS NOT NULL AND match.mnbMatchId != \'111\' ' +
                'AND match.mnbPushed IS NULL AND DATE_ADD(match.startTime, INTERVAL 30 MINUTE) <= NOW()')
            .andWhere('match.deleted_at is null')
            .getMany();
    }

    public async findMatchById(id: number): Promise<Match> {
        let query = this.entityManager.createQueryBuilder(Match, 'match')
            .andWhere('match.id = :id', {id});
        this.addDefaultJoin(query);
        return query.getOne();
    }

    public async findAdminMatchById(
        matchId: number = undefined,
        lineups: number = undefined,
    ): Promise<any> {
        let response = {
            match: Match,
            umpires: [],
            team1players: [],
            team2players: []
        }
        let result = await this.entityManager.query("call wsa.usp_get_match(?,?)",[matchId, lineups]);
        if(result!= null && result[0]!= null) {
            response.match = result[0];
            response.umpires = result[1];
            response.team1players = result[2];
            response.team2players = result[3];
            response.umpires = result[4];
            return response;
        } else {
          return [];
        }
    }

    public async findMatchByIds(ids: number[]): Promise<Match[]> {
        let query = this.entityManager.createQueryBuilder(Match, 'match')
            .andWhere('match.id in (:ids)', {ids});
        this.addDefaultJoin(query);
        return query.getMany();
    }

    public async findByParam(from: Date, to: Date, teamIds: number[] = [], playerIds: number[],
        competitionId: number, divisionIds: number[], organisationIds: number[], matchEnded: boolean,
        matchStatus: ("STARTED" | "PAUSED" | "ENDED")[], roundName: string, search: string, offset: number = undefined, limit: number = undefined): Promise<any> {

        let query = await this.entityManager.createQueryBuilder(Match, 'match');
        if (from) query.andWhere("match.startTime >= :from", { from });
        if (to) query.andWhere("match.startTime <= :to", { to });

        this.filterByOrganisationTeam(competitionId, organisationIds, teamIds, query);
        if (matchEnded != undefined) query.andWhere("match.matchEnded is :matchEnded", { matchEnded });
        if (matchStatus) query.andWhere("match.matchStatus in (:matchStatus)", { matchStatus });
        if (divisionIds != undefined && divisionIds != null) query.andWhere("match.divisionId in (:divisionIds)", { divisionIds });
        if (isNotNullAndUndefined(roundName) && roundName !== '') query.andWhere("round.name = :roundName", { roundName });
        if (isNotNullAndUndefined(search) && search!=='') {
            const search_ = `%${search.toLowerCase()}%`;
            query.andWhere(
                `(lower(team1.name) like :search1 or lower(team2.name) like :search2)`,
                { search1:search_,search2:search_ });
        }
        query.orderBy('match.startTime', 'ASC');

        // return query.paginate(offset,limit).getMany();
        // switched to skip and limit function as with paginate(offset,limit) with offset 0, typeorm-plus gives the value
        // in negative as offset creating an error within query
        if (isNotNullAndUndefined(limit) && isNotNullAndUndefined(offset)) {
            const matchCount = await query.getCount();
            const result = await query.skip(offset).take(limit).getMany();
            return {matchCount,result}
        } else {
            const matchCount =  null;
            const result = await query.getMany();
            return {matchCount,result}
        }
    }

    public async getMatchResultTypes(): Promise<MatchResultType[]> {
        return this.entityManager.createQueryBuilder(MatchResultType, 'mr')
            .getMany();
    }

    public async loadHomeLive(organisationIds: number[], teamIds: number[] = []): Promise<Match[]> {
        let query = this.entityManager.createQueryBuilder(Match, 'match');
        this.filterByOrganisationTeam(undefined, organisationIds, teamIds, query);
        query.andWhere(new Brackets(qb => {
            qb.andWhere("match.matchStatus is null")
                .andWhere("match.startTime < (now())")
                .orWhere("match.matchStatus != 'ENDED'")
        }));
        query.orderBy('match.startTime', 'ASC');
        return query.getMany()
    }

    public async loadHomeUpcoming(organisationIds: number[], teamIds: number[], upcomingStartTimeRange: number): Promise<Match[]> {
        let query = this.entityManager.createQueryBuilder(Match, 'match');
        this.filterByOrganisationTeam(undefined, organisationIds, teamIds, query);
        query.andWhere(new Brackets(qb => {
            qb.andWhere("match.startTime > now()");
            if (upcomingStartTimeRange) {
                qb.andWhere("match.startTime < (now() + interval :upcomingStartTimeRange minute )",
                    {upcomingStartTimeRange});
            }
            qb.andWhere("match.matchStatus is null");
        }));

        query.orderBy('match.startTime', 'ASC');
        return query.getMany();
    }

    public async loadHomeEnded(organisationIds: number[], teamIds: number[], endTimeRange: number) {
        let query = this.entityManager.createQueryBuilder(Match, 'match');
        this.filterByOrganisationTeam(undefined, organisationIds, teamIds, query);
        query.andWhere(new Brackets(qb => {
            qb.andWhere("match.endTime > (now() - interval :endTimeRange minute )", {endTimeRange})
                .andWhere("match.endTime < (now())")
                .andWhere("match.matchStatus = 'ENDED'");
        }));
        query.orderBy('match.endTime', 'ASC');
        return query.getMany();
    }

    public async loadCompetitionAndDate(competitionId: number, start: Date, end: Date, live: boolean): Promise<Match[]> {
        let query = this.entityManager.createQueryBuilder(Match, 'match');
        this.addDefaultJoin(query);
        query.andWhere("match.competitionId = :id", {id: competitionId});
        if (live) {
            query.andWhere("match.matchStatus = 'STARTED'");
        } else {
            query.andWhere("match.matchStatus is null");
        }
        if (start) query.andWhere("match.startTime >= :start", {start});
        if (end) query.andWhere("match.startTime <= :end", {end});
        query.orderBy('match.startTime', 'ASC');
        return query.getMany()
    }

    public async loadAdmin(competitionId: number, teamId: number, roleId: number, requestFilter: RequestFilter): Promise<any> {
        let result = await this.entityManager.query("call wsa.usp_get_matches(?,?,?,?,?)",
            [competitionId, teamId, roleId, requestFilter.paging.offset, requestFilter.paging.limit]);

            if (result != null) {
                let totalCount = (result[1] && result[1].find(x=>x)) ? result[1].find(x=>x).totalCount : 0;
                let responseObject = paginationData(stringTONumber(totalCount), requestFilter.paging.limit, requestFilter.paging.offset);
                responseObject["matches"] = result[0];
                return responseObject;
            } else {
                return [];
            }
    }

    public async loadDashboard(competitionId: number, startDate: Date, requestFilter: RequestFilter): Promise<any> {
        let result = await this.entityManager.query("call wsa.usp_get_dashboard_matches(?,?,?,?)",
            [competitionId, startDate, requestFilter.paging.offset, requestFilter.paging.limit]);

            if (result != null) {
                let totalCount = (result[1] && result[1].find(x=>x)) ? result[1].find(x=>x).totalCount : 0;
                let responseObject = paginationData(stringTONumber(totalCount), requestFilter.paging.limit, requestFilter.paging.offset);
                responseObject["matches"] = result[0];
                return responseObject;
            } else {
                return [];
            }
    }

    public async loadGamePositions() {
        return this.entityManager.createQueryBuilder(GamePosition, 'gp').getMany();
    }

    public async loadGameStats() {
        return this.entityManager.createQueryBuilder(GameStat, 'gs').getMany();
    }

    public async findLineupsByParam(matchId: number, competitionId: number, teamId: number, playerId: number,
                                    positionId: number): Promise<Lineup[]> {
        let query = this.entityManager.createQueryBuilder(Lineup, 'lu')
            .andWhere('lu.matchId = :matchId', {matchId})
            .andWhere('lu.teamId = :teamId', {teamId});

        if (competitionId) query.andWhere("lu.competitionId = :competitionId", {competitionId});
        if (playerId) query.andWhere("lu.playerId = :playerId", {playerId});
        if (positionId) query.andWhere("lu.positionId = :positionId", {positionId});
        return query.getMany()
    }

    public async batchSaveLineups(lineups: Lineup[]) {
        return this.entityManager.save(Lineup.name, lineups);
    }

    public async deleteLineups(matchId: number, teamId: number) {
        return this.entityManager.createQueryBuilder().delete().from(Lineup)
            .andWhere("matchId = :matchId and teamId = :teamId", {matchId, teamId}).execute();
    }

    public async logMatchEvent(matchId: number, category: string, type: string, period: number, eventTimestamp: Date,
                               userId: number,
                               attribute1Key: string = undefined, attribute1Value: string = undefined,
                               attribute2Key: string = undefined, attribute2Value: string = undefined) {
        let me = new MatchEvent();
        me.matchId = matchId;
        me.eventCategory = category;
        me.type = type;
        me.eventTimestamp = eventTimestamp;
        me.period = period;
        if (attribute1Key) {
            me.attribute1Key = attribute1Key;
            me.attribute1Value = attribute1Value;
        }
        if (attribute2Key) {
            me.attribute2Key = attribute2Key;
            me.attribute2Value = attribute2Value;
        }
        me.userId = userId;
        me.source = 'app';

        // To convert into avro format
        let inferredType = avro.Type.forValue(me); // Infer the type of a `me`.
        let buf = inferredType.toBuffer(me);
        const params = {
            Bucket: process.env.EVENT_STORE_BUCKET, // pass your bucket name
            Key: Date.now()+".avro",
            Body: buf
        };
        s3.upload(params, function(s3Err, data) {
            if (s3Err) throw s3Err;

            console.log("File uploaded successfully");
        });

        return this.entityManager.insert(MatchEvent, me);
    }

    public async logLiteMatchEvent(matchId: number, category: string, type: string, period: number,
                                   eventTimestamp: Date, userId: number) {
        let me = new MatchEvent();
        me.matchId = matchId;
        me.eventCategory = category;
        me.type = type;
        me.period = period;
        me.userId = userId;
        me.source = 'app';
        return this.entityManager.insert(MatchEvent, me);
    }

    public async findByDate(from: Date, to: Date): Promise<Match[]> {
        let query = this.entityManager.createQueryBuilder(Match, 'match');
        if (from) query.andWhere("match.startTime >= :from", { from });
        if (to) query.andWhere("match.startTime <= :to", { to });
        return query.getMany()
    }

     public async findByRound(roundId: number): Promise<Match[]> {
        let query = this.entityManager.createQueryBuilder(Match, 'match');
        query.andWhere("match.roundId = :roundId", { roundId });
        return query.getMany();
    }

    public async softDelete(id: number, userId:number): Promise<DeleteResult> {
        let query = this.entityManager.createQueryBuilder(Match, 'match');
        query.andWhere("match.id = :id", { id });
        return query.softDelete().execute();
    }

    public async findTodaysMatchByParam(from: Date, to: Date, teamIds: number[] = [], playerIds: number[],
        competitionId: number, organisationIds: number[], offset: number = undefined, limit: number = undefined): Promise<any> {

        let query = await this.entityManager.createQueryBuilder(Match, 'match');
        if (from) query.andWhere("match.startTime >= cast(:from as datetime)", { from });
        if (to) query.andWhere("match.startTime < ( cast(:to as datetime) + INTERVAL 1 DAY )", { to });

        this.filterByOrganisationTeam(competitionId, organisationIds, teamIds, query);
        query.orderBy('match.startTime', 'ASC');

        if (limit) {
            const matchCount = await query.getCount();
            const result = await query.skip(offset).take(limit).getMany();
            return { matchCount, result }
        } else {
            const matchCount = null;
            const result = await query.getMany();
            return { matchCount, result }
        }
    }

    public async getMatchDetailsForVenueCourtUpdate(competitionId: number,startTime: Date, endTime: Date, fromCourtIds: number[]): Promise<Match[]> {

        let query = await this.entityManager.createQueryBuilder(Match, 'match');
        if (startTime) query.andWhere("match.startTime >= cast(:startTime as datetime)", { startTime });
        if (endTime) query.andWhere("match.startTime < cast(:endTime as datetime)", { endTime });
        if (fromCourtIds) query.andWhere("match.venueCourtId in (:...fromCourtIds)", { fromCourtIds });
        if (competitionId) query.andWhere("match.competitionId = :competitionId", { competitionId });

        return await query.getMany();
    }

    public async logMatchPauseTime(
        matchId: number,
        period: number,
        isBreak: boolean,
        totalPausedMs: number) {
          let matchPausedTime = new MatchPausedTime();
          matchPausedTime.matchId = matchId;
          matchPausedTime.period = period;
          matchPausedTime.isBreak = isBreak;
          matchPausedTime.totalPausedMs = totalPausedMs;

          return this.entityManager.insert(MatchPausedTime, matchPausedTime);
    }

    public async getMatchTimezone(location: Location): Promise<StateTimezone> {
        let query = await this.entityManager.createQueryBuilder(StateTimezone, 'stateTimezone')
                              .andWhere('stateTimezone.stateRefId = :locationId', {locationId: location.id});
        return query.getOne();
    }

    public async updateMatchStatEvent(
        matchId: number,
        team: String,
        gamePositionId: number,
        playerId: number
    ) {
        let query = this.entityManager.createQueryBuilder(MatchEvent, 'me')
                        .update(MatchEvent)
                        .set({attribute2Value: playerId.toString()})
                        .where("eventCategory = 'stat'")
                        .andWhere("matchId = :matchId", {matchId})
                        .andWhere("attribute1Key = :team", {team})
                        .andWhere("attribute1Value = :gamePositionId", {gamePositionId});
        return query.execute();
    }
}
