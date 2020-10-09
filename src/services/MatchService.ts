import {Service} from "typedi";
import pdf from "html-pdf";
import hummus from "hummus";
import memoryStreams from "memory-streams";
import avro from "avsc";
import {Brackets, DeleteResult} from "typeorm-plus";

import BaseService from "./BaseService";
import {logger} from "../logger";
import getMatchSheetTemplate from "../utils/MatchSheetTemplate";
import {paginationData, stringTONumber, isNotNullAndUndefined, s3, isArrayPopulated} from "../utils/Utils";
import {Match} from "../models/Match";
import {MatchResultType} from "../models/MatchResultType";
import {GamePosition} from "../models/GamePosition";
import {GameStat} from "../models/GameStat";
import {MatchEvent} from "../models/MatchEvent";
import {MatchPausedTime} from "../models/MatchPausedTime";
import {Lineup} from "../models/Lineup";
import {RequestFilter} from "../models/RequestFilter";
import {StateTimezone} from "../models/StateTimezone";
import {LinkedCompetitionOrganisation} from "../models/LinkedCompetitionOrganisation";
import {Competition} from "../models/Competition";
import {User} from "../models/User";
import {MatchSheet} from "../models/MatchSheet";
import { convertMatchStartTimeByTimezone } from "../utils/TimeFormatterUtils";
let constants = require('../constants/Constants');

@Service()
export default class MatchService extends BaseService<Match> {

    modelName(): string {
        return Match.name;
    }

    private filterByOrganisationTeam(competitionId: number = undefined, organisationIds: number[] = [], teamIds: number[] = [], query) {
        this.addDefaultJoin(query);
        if (competitionId || (teamIds && teamIds.length > 0) || (organisationIds && organisationIds.length > 0)) {
            query.andWhere(new Brackets(qb => {
                if (competitionId) qb.orWhere("match.competitionId = :competitionId", { competitionId });
                if (teamIds && teamIds.length > 0) {
                    qb.orWhere("(match.team1Id in (:teamIds) or match.team2Id in (:teamIds))", { teamIds });
                }
                if (organisationIds && organisationIds.length > 0) {
                    qb.orWhere("(team1.organisationId in (:organisationIds) or team2.organisationId in (:organisationIds))", { organisationIds });
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
            .select(['match', 'competition', 'competition.mnbUser', 'competition.mnbPassword', 'competition.mnbUrl'])
            .andWhere('match.mnbMatchId IS NOT NULL AND match.mnbMatchId != \'111\' ' +
                'AND match.mnbPushed IS NULL AND DATE_ADD(match.startTime, INTERVAL 30 MINUTE) <= NOW()')
            .andWhere('match.deleted_at is null')
            .getMany();
    }

    public async findMatchById(id: number): Promise<Match> {
        let query = this.entityManager.createQueryBuilder(Match, 'match')
            .andWhere('match.id = :id', { id });
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
            team2players: [],
            rosters: []
        }
        let result = await this.entityManager.query("call wsa.usp_get_match(?,?)", [matchId, lineups]);
        if (result != null && result[0] != null) {
            // if(isArrayPopulated(result[0])){
            //     result[0].map((x) => {
            //         x.resultStatus  = x.resultStatus == 0 ? null : x.resultStatus;
            //     })
            // }
            response.match = result[0];
            response.umpires = result[1];
            response.team1players = result[2];
            response.team2players = result[3];
            response.umpires = result[4];
            response.rosters = result[5];

            return response;
        } else {
            return [];
        }
    }

    public async findMatchByIds(ids: number[]): Promise<Match[]> {
        let query = this.entityManager.createQueryBuilder(Match, 'match')
            .andWhere('match.id in (:ids)', { ids });
        this.addDefaultJoin(query);
        return query.getMany();
    }

    public async findByParam(
        from: Date, to: Date,
        teamIds: number[] = [], playerIds: number[], competitionId: number, divisionIds: number[], organisationIds: number[],
        matchEnded: boolean, matchStatus: ("STARTED" | "PAUSED" | "ENDED")[], roundName: string,
        search: string, offset: number = undefined, limit: number = undefined,
        sortBy: string = undefined, sortOrder: "ASC" | "DESC" = undefined
    ): Promise<any> {
        let query = await this.entityManager.createQueryBuilder(Match, 'match');
        if (from) query.andWhere("match.startTime >= :from", { from });
        if (to) query.andWhere("match.startTime <= :to", { to });

        this.filterByOrganisationTeam(competitionId, organisationIds, teamIds, query);

        if (matchEnded != undefined) query.andWhere("match.matchEnded is :matchEnded", { matchEnded });
        if (matchStatus) query.andWhere("match.matchStatus in (:matchStatus)", { matchStatus });
        if (divisionIds != undefined && divisionIds != null) query.andWhere("match.divisionId in (:divisionIds)", { divisionIds });
        if (isNotNullAndUndefined(roundName) && roundName !== '') query.andWhere("round.name = :roundName", { roundName });
        if (isNotNullAndUndefined(search) && search !== '') {
            const search_ = `%${search.toLowerCase()}%`;
            query.andWhere(
                `(lower(team1.name) like :search1 or lower(team2.name) like :search2)`,
                { search1: search_, search2: search_ }
            );
        }
        if (sortBy) {
            if (sortBy === 'team1') {
                query.orderBy('team1.name', sortOrder);
            } else if (sortBy === 'team2') {
                query.orderBy('team2.name', sortOrder);
            } else if (sortBy === 'venueCourt') {
                query.orderBy('venue.name', sortOrder);
                query.addOrderBy('venueCourt.name', sortOrder);
            } else if (sortBy === 'division') {
                query.orderBy('division.name', sortOrder);
            } else if (sortBy === 'score') {
                query.orderBy('match.team1Score', sortOrder);
                query.addOrderBy('match.team2Score', sortOrder);
            } else if (sortBy === 'qtrBreak') {
                query.orderBy('match.breakDuration', sortOrder);
            } else {
                query.orderBy(`match.${ sortBy }`, sortOrder);
            }
        } else {
            query.orderBy('match.startTime', 'ASC');
        }

        // return query.paginate(offset,limit).getMany();
        // switched to skip and limit function as with paginate(offset,limit) with offset 0, typeorm-plus gives the value
        // in negative as offset creating an error within query
        if (isNotNullAndUndefined(limit) && isNotNullAndUndefined(offset)) {
            const matchCount = await query.getCount();
            const result = await query.skip(offset).take(limit).getMany();
            return { matchCount, result }
        } else {
            const matchCount = null;
            const result = await query.getMany();
            return { matchCount, result }
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
                    { upcomingStartTimeRange });
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
            qb.andWhere("match.endTime > (now() - interval :endTimeRange minute )", { endTimeRange })
                .andWhere("match.endTime < (now())")
                .andWhere("match.matchStatus = 'ENDED'");
        }));
        query.orderBy('match.endTime', 'ASC');
        return query.getMany();
    }

    public async loadCompetitionAndDate(competitionId: number, start: Date, end: Date, live: boolean): Promise<Match[]> {
        let query = this.entityManager.createQueryBuilder(Match, 'match');
        this.addDefaultJoin(query);
        query.andWhere("match.competitionId = :id", { id: competitionId });
        if (live) {
            query.andWhere("match.matchStatus = 'STARTED'");
        } else {
            query.andWhere("match.matchStatus is null");
        }
        if (start) query.andWhere("match.startTime >= :start", { start });
        if (end) query.andWhere("match.startTime <= :end", { end });
        query.orderBy('match.startTime', 'ASC');
        return query.getMany()
    }

    public async loadAdmin(competitionId: number, teamId: number, roleId: number, requestFilter: RequestFilter): Promise<any> {
        let result = await this.entityManager.query("call wsa.usp_get_matches(?,?,?,?,?)",
            [competitionId, teamId, roleId, requestFilter.paging.offset, requestFilter.paging.limit]);

        if (result != null) {
            let totalCount = (result[1] && result[1].find(x => x)) ? result[1].find(x => x).totalCount : 0;
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
            let totalCount = (result[1] && result[1].find(x => x)) ? result[1].find(x => x).totalCount : 0;
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
            .andWhere('lu.matchId = :matchId', { matchId })
            .andWhere('lu.teamId = :teamId', { teamId });

        if (competitionId) query.andWhere("lu.competitionId = :competitionId", { competitionId });
        if (playerId) query.andWhere("lu.playerId = :playerId", { playerId });
        if (positionId) query.andWhere("lu.positionId = :positionId", { positionId });
        return query.getMany()
    }

    public async batchSaveLineups(lineups: Lineup[]) {
        return this.entityManager.save(Lineup.name, lineups);
    }

    public async deleteLineups(matchId: number, teamId: number) {
        return this.entityManager.createQueryBuilder().delete().from(Lineup)
            .andWhere("matchId = :matchId and teamId = :teamId", { matchId, teamId }).execute();
    }

    public async deleteLineupById(id: number) {
        return this.entityManager.createQueryBuilder().delete().from(Lineup)
            .andWhere("id = :id", { id }).execute();
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
            Key: Date.now() + ".avro",
            Body: buf
        };
        s3.upload(params, function (s3Err, data) {
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

    public async findByDate(from: Date, to: Date, competitionId: number = undefined): Promise<Match[]> {
        let query = this.entityManager.createQueryBuilder(Match, 'match');
        if (from) query.andWhere("match.startTime >= :from", { from });
        if (to) query.andWhere("match.startTime <= :to", { to });
        if (competitionId) query.andWhere("match.competitionId = :competitionId", { competitionId });
        return query.getMany()
    }

    public async findByRound(roundId: number): Promise<Match[]> {
        let query = this.entityManager.createQueryBuilder(Match, 'match');
        query.andWhere("match.roundId = :roundId", { roundId });
        return query.getMany();
    }

    public async softDelete(id: number, userId: number): Promise<DeleteResult> {
        let query = this.entityManager.createQueryBuilder(Match, 'match');
        query.andWhere("match.id = :id", { id });
        return query.softDelete().execute();
    }

    public async findTodaysMatchByParam(from: Date, to: Date, teamIds: number[] = [], playerIds: number[],
                                        competitionId: number, organisationIds: number[], offset: number = undefined, limit: number = undefined): Promise<any> {

        let query = await this.entityManager.createQueryBuilder(Match, 'match');
        if (from && to) {
            query.andWhere(`((match.startTime < cast(:from as datetime) and match.matchStatus != 'ENDED') or
            (match.startTime > cast(:from as datetime) and match.startTime < ( cast(:to as datetime) + INTERVAL 1 DAY)) or
            (match.startTime > (cast(:to as datetime) + INTERVAL 1 DAY) and (match.matchStatus is not null))
            )`, { from, to });
        }

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

    public async getMatchDetailsForVenueCourtUpdate(competitionId: number, startTime: Date, endTime: Date, fromCourtIds: number[]): Promise<Match[]> {

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
        totalPausedMs: number
    ) {
        let matchPausedTime = new MatchPausedTime();
        matchPausedTime.matchId = matchId;
        matchPausedTime.period = period;
        matchPausedTime.isBreak = isBreak;
        matchPausedTime.totalPausedMs = totalPausedMs;

        return this.entityManager.insert(MatchPausedTime, matchPausedTime);
    }

    public async getMatchTimezone(locationId: number): Promise<StateTimezone> {
        let query = await this.entityManager.createQueryBuilder(StateTimezone, 'stateTimezone')
            .andWhere('stateTimezone.stateRefId = :locationId', { locationId: locationId });
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
            .set({ attribute2Value: playerId.toString() })
            .where("eventCategory = 'stat'")
            .andWhere("matchId = :matchId", { matchId })
            .andWhere("attribute1Key = :team", { team })
            .andWhere("attribute1Value = :gamePositionId", { gamePositionId });
        return query.execute();
    }

    /**
     * Concatenate two PDFs in Buffers
     * @param {Buffer} firstBuffer
     * @param {Buffer} secondBuffer
     * @returns {Buffer} - a Buffer containing the concactenated PDFs
     */
    private combinePDFBuffers = (firstBuffer: Buffer, secondBuffer: Buffer): Buffer => {
        const outStream = new memoryStreams.WritableStream();

        try {
            const firstPDFStream = new hummus.PDFRStreamForBuffer(firstBuffer);
            const secondPDFStream = new hummus.PDFRStreamForBuffer(secondBuffer);

            const pdfWriter = hummus.createWriterToModify(firstPDFStream, new hummus.PDFStreamForResponse(outStream));
            pdfWriter.appendPDFPagesFromPDF(secondPDFStream);
            pdfWriter.end();
            const newBuffer = outStream.toBuffer();
            outStream.end();

            return newBuffer;
        } catch (e) {
            outStream.end();
        }
    };

    /**
     * Generate PDF
     * @param {String} templateType
     * @param {User} user
     * @param {LinkedCompetitionOrganisation} competitionOrganisation
     * @param {Competition} competition
     * @param {number[]} divisionIds
     * @param {number[]} teamIds
     * @param {string} roundName
     * @returns {String} - generated PDF download link
     */
    public async printMatchSheetTemplate(
        templateType: string,
        user: User,
        organisation: any,
        competition: Competition,
        divisionIds: number[],
        teamIds: number[],
        roundName: string,
    ): Promise<MatchSheet> {
        try {
            const matchFound = await this.findByParam(
                null,
                null,
                teamIds,
                null,
                competition.id,
                divisionIds,
                null,
                null,
                null,
                null,
                null,
                null,
                null
            );
            let filteredMatches = matchFound.result;
            if (teamIds !== null) {
                filteredMatches = filteredMatches.filter((match) => match.team1Id === teamIds || match.team2Id === teamIds);
            }
            if (roundName !== null) {
                filteredMatches = filteredMatches.filter((match) => match.round.name === roundName);
            }

            let competitionTimezone: StateTimezone;
            if (competition && competition.locationId) {
                competitionTimezone = await this.getMatchTimezone(competition.locationId);
            }

            filteredMatches.map(m=> {
                m.startTime = convertMatchStartTimeByTimezone(
                    m.startTime, competitionTimezone != null ? competitionTimezone.timezone : null,
                    `${constants.DATE_FORMATTER_KEY} ${constants.TIME_FORMATTER_KEY}`)
                return m;
            });

            let pdfBuf: Buffer;

            const createPDF = (html, options): Promise<Buffer> => new Promise(((resolve, reject) => {
                pdf.create(html, options).toBuffer((err, buffer) => {
                    if (err !== null) {
                        reject(err);
                    } else {
                        resolve(buffer);
                    }
                });
            }));

            for (let i = 0; i < filteredMatches.length; i++) {
                const matchDetail = await this.findAdminMatchById(filteredMatches[i].id, 2);
                const { team1players, team2players, umpires } = matchDetail;
                const htmlTmpl = getMatchSheetTemplate(
                    templateType,
                    organisation,
                    team1players,
                    team2players,
                    umpires,
                    filteredMatches[i]
                );

                const options = { width: '595px', height: '842px', format: 'A4' };

                await createPDF(htmlTmpl, options).then((newBuffer) => {
                    if (pdfBuf) {
                        pdfBuf = this.combinePDFBuffers(pdfBuf, newBuffer);
                    } else {
                        pdfBuf = newBuffer;
                    }
                });
            }

            let matchSheet = new MatchSheet();

            const replaceStr = (str) => str ? str.split(' ').join('_') : '';

            if (filteredMatches.length > 0) {
                let teamName = 'All_teams';
                if (teamIds !== null) {
                    teamName = filteredMatches[0].team1Id === teamIds
                        ? replaceStr(filteredMatches[0].team1.name)
                        : replaceStr(filteredMatches[0].team2.name);
                }

                const fileName = `${replaceStr(competition.name)}_${
                    divisionIds === null
                        ? 'All_Divisions_'
                        : replaceStr(filteredMatches[0].division.name)
                }_${teamName}_${roundName || 'All_rounds'}_${templateType}_${Date.now()}.pdf`;

                const params = {
                    Bucket: process.env.MATCH_SHEET_STORE_BUCKET,
                    Key: fileName,
                    Body: pdfBuf,
                    ACL: 'public-read'
                };

                await s3.upload(params).promise().then((data) => {
                    matchSheet.userId = user.id;
                    matchSheet.name = fileName;
                    matchSheet.downloadUrl = data.Location;
                    matchSheet.competitionId = competition.id;
                    matchSheet.competitionName = competition.name;
                    matchSheet.createdAt = new Date();
                });
            }

            return matchSheet;
        } catch (e) {
            logger.error(`Failed generating PDF`, e);
        }
    }

    public async findNumberOfMatches(divisionId: number): Promise<number> {
        return this.entityManager.createQueryBuilder(Match, 'match')
            .innerJoin('match.division', 'division')
            .where('match.divisionId = :divisionId', { divisionId: divisionId })
            .andWhere('match.deleted_at is null')
            .andWhere('division.deleted_at is null')
            .getCount();
    }

    public async updateLivestreamURL(matchId: number, livestreamURL: string): Promise<any> {
        return this.entityManager.createQueryBuilder(Match, 'm').update()
            .set({livestreamURL: livestreamURL})
            .where("id = :matchId", {matchId})
            .execute();
    }
}
