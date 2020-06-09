import {
    Param,
    Authorized,
    Post,
    Body,
    Res,
    HeaderParam,
    Delete
 } from "routing-controllers";
import {Competition} from '../models/Competition';
import { CompetitionLadderSettings } from '../models/CompetitionLadderSettings';
import {Get, JsonController, QueryParam, UploadedFile} from 'routing-controllers';
import {Response} from "express";
import {Team} from "../models/Team";
import {Organisation} from "../models/Organisation";
import {Player} from "../models/Player";
import {User} from "../models/User";
import {BaseController} from "./BaseController";
import {RequestFilter} from "../models/RequestFilter";
import { CompetitionVenue } from "../models/CompetitionVenue";
import { isPhoto, fileExt, stringTONumber, stringToBoolean, timestamp, uuidv4, isArrayEmpty, isNotNullAndUndefined } from "../utils/Utils"
import { CompetitionOrganisation } from "../models/CompetitionOrganisation";


@JsonController('/competitions')
export class CompetitionController extends BaseController {


    @Get('/id/:id')
    async get(@Param("id") id: number) {
        return this.competitionService.findById(id);
    }

    @Authorized()
    @Delete('/id/:id')
    async delete(
        @Param("id") id: number,
        @HeaderParam("authorization") user: User)
    {
        return this.competitionService.softDelete(id, user.id);
    }

    @Get('/')
    async find(
        @QueryParam('name') name: string,
        @QueryParam('locationId') locationId: number
    ): Promise<Competition[]> {
        return this.competitionService.findByName(name, locationId);
    }

    @Authorized()
    @Post('/')
    async createOrUpdate(
        @HeaderParam('authorization') user: User,
        @QueryParam('venues') venues: number[],
        @Body() competition: any,
        @UploadedFile("logo") file: Express.Multer.File,
        @Res() response: Response
    ): Promise<any> {
        try {
        if (competition) {
            // updates with multipart have some issue, fields need to be mapped directly, and id needs to be converted explicitly to number
            let c = new Competition();
            if (competition.id) {
                c.id = stringTONumber(competition.id);
            }
            if (competition.organisationId) {
                c.organisationId = stringTONumber(competition.organisationId);
            }
            c.name = competition.name;
            c.longName = competition.longName;
            c.name = competition.name;
            c.recordUmpire = competition.recordUmpire;
            c.recordUmpireType = competition.recordUmpireType;
            c.gameTimeTracking = stringToBoolean(competition.gameTimeTracking);
            c.positionTracking = stringToBoolean(competition.positionTracking);
            c.recordGoalAttempts = stringToBoolean(competition.recordGoalAttempts);
            c.centrePassEnabled = stringToBoolean(competition.centrePassEnabled);
            c.incidentsEnabled = stringToBoolean(competition.incidentsEnabled);
            c.attendanceRecordingType = competition.attendanceRecordingType;
            c.attendanceRecordingPeriod = competition.attendanceRecordingPeriod;
            c.attendanceSelectionTime = competition.attendanceSelectionTime ? stringTONumber(competition.attendanceSelectionTime) : null;
            c.lineupMaxPlayers = competition.lineupMaxPlayers ? stringTONumber(competition.lineupMaxPlayers) : null;
            c.lineupSelectionTime = competition.lineupSelectionTime ? stringTONumber(competition.lineupSelectionTime) : null;
            c.lineupSelectionEnabled = stringToBoolean(competition.lineupSelectionEnabled);
            c.scoringType = competition.scoringType;
            c.timerType = competition.timerType;
            c.buzzerEnabled = stringToBoolean(competition.buzzerEnabled);
            c.warningBuzzerEnabled = stringToBoolean(competition.warningBuzzerEnabled);

            if(c.id===0) c.uniqueKey = uuidv4();

            let saved = await this.competitionService.createOrUpdate(c);

            if (isNotNullAndUndefined(competition.invitedTo) && competition.invitedTo !== '') {
                competition.invitedTo = JSON.parse(competition.invitedTo)
            }

            if (isNotNullAndUndefined(competition.invitedOrganisation) && competition.invitedOrganisation !== '') {
                competition.invitedOrganisation = JSON.parse(competition.invitedOrganisation)
            }

            if ((isNotNullAndUndefined(competition.invitedTo) && competition.invitedTo !== '' && isArrayEmpty(competition.invitedTo)) ||
                (isNotNullAndUndefined(competition.invitedOrganisation) && competition.invitedOrganisation !== '' && isArrayEmpty(competition.invitedOrganisation))) {

                let affliliateInvited = 0;
                const INVITED_TO = competition.invitedTo;
                let GET_ORGANISATIONS;
                let invitationTo;

                const MULTIPLE_ORGANISATIONS = [];
                const ORG_ARRAY = [];
                const CREATE_COMP_ORG = [];

                const AFFILIATED_ASSOCIATION = Competition.AFFILIATED_ASSOCIATION;
                const AFFILIATED_CLUB = Competition.AFFILIATED_CLUB;
                const ANY_ASSOCIATION = Competition.ANY_ORGANISATION_ASSOCIATION;
                const ANY_CLUB = Competition.ANY_ORGANISATION_CLUB;
                const DIRECT = Competition.DIRECT_INVITE;

                if ((INVITED_TO.includes(AFFILIATED_ASSOCIATION) || INVITED_TO.includes(AFFILIATED_CLUB))
                    && (INVITED_TO.includes(ANY_ASSOCIATION) || INVITED_TO.includes(ANY_CLUB))) {

                    if (INVITED_TO.includes(AFFILIATED_ASSOCIATION) && (!INVITED_TO.includes(AFFILIATED_CLUB))) { // Association selected
                        affliliateInvited = 3;
                        invitationTo = 2;
                    } else if (INVITED_TO.includes(AFFILIATED_CLUB) && (!INVITED_TO.includes(AFFILIATED_ASSOCIATION))) { // Club selected
                        affliliateInvited = 4;
                        invitationTo = 3;
                    }

                    GET_ORGANISATIONS = await this.competitionService.getAllAffiliatedOrganisations(competition.organisationId, affliliateInvited, invitationTo);

                    if (isNotNullAndUndefined(competition.invitedOrganisation)) {
                        MULTIPLE_ORGANISATIONS.push(...GET_ORGANISATIONS, ...competition.invitedOrganisation);
                    } else {
                        MULTIPLE_ORGANISATIONS.push(...GET_ORGANISATIONS);
                    }

                    ORG_ARRAY.push(...MULTIPLE_ORGANISATIONS);

                } else {

                    if (INVITED_TO.includes(AFFILIATED_ASSOCIATION) && (!INVITED_TO.includes(AFFILIATED_CLUB, DIRECT, ANY_ASSOCIATION, ANY_CLUB))) { // Association selected
                        affliliateInvited = 3;
                        invitationTo = 2;
                    } else if (INVITED_TO.includes(AFFILIATED_CLUB) && (!INVITED_TO.includes(AFFILIATED_ASSOCIATION, DIRECT, ANY_ASSOCIATION, ANY_CLUB))) { // Club selected
                        affliliateInvited = 4;
                        invitationTo = 3;
                    }

                    GET_ORGANISATIONS = await this.competitionService.getAllAffiliatedOrganisations(competition.organisationId, affliliateInvited, invitationTo);


                    if (INVITED_TO.includes(DIRECT) && (!INVITED_TO.includes(AFFILIATED_ASSOCIATION, AFFILIATED_CLUB, ANY_ASSOCIATION, ANY_CLUB))) { // Direct Invited
                        GET_ORGANISATIONS = [{ organisationId: competition.organisationId }];
                    }

                    if (isNotNullAndUndefined(competition.invitedOrganisation) && isArrayEmpty(competition.invitedOrganisation)) { // Any Organisation Invited
                        if ((INVITED_TO.includes(ANY_ASSOCIATION) || INVITED_TO.includes(ANY_CLUB)) && (!INVITED_TO.includes(AFFILIATED_ASSOCIATION, AFFILIATED_CLUB, DIRECT))) {
                            GET_ORGANISATIONS = competition.invitedOrganisation;
                        }
                    }

                    ORG_ARRAY.push(...GET_ORGANISATIONS);
                }

                for (let i of ORG_ARRAY) {
                    const compOrg = new CompetitionOrganisation();
                    compOrg.id = 0;
                    compOrg.competitionId = saved.id;
                    compOrg.orgId = i.organisationId;
                    CREATE_COMP_ORG.push(compOrg);
                }

                await this.competitionOrganisationService.batchCreateOrUpdate(CREATE_COMP_ORG);
            }

            await this.competitionVenueService.deleteByCompetitionId(saved.id);
            let cvArray = [];
            for (let i of venues) {
                let cv = new CompetitionVenue();
                cv.venueId = i;
                cv.competitionId = saved.id;
                cvArray.push(cv);
            }
            let data = await this.competitionVenueService.batchCreateOrUpdate(cvArray)

            if (file && isPhoto(file.mimetype)) {
                let filename = `/comp_${saved.id}/logo_${timestamp()}.${fileExt(file.originalname)}`;
                let result = await this.firebaseService.upload(filename, file);
                if (result) {
                    saved.logoUrl = result['url'];
                    saved = await this.competitionService.createOrUpdate(saved);
                    return saved;
                } else {
                    return response
                        .status(400).send(
                            { name: 'save_error', message: 'Logo not saved, try again later.' });
                }

            } else {
                /*let organisation = await this.organisationService.findById(savedTeam.organisationId);
                if (organisation.logoUrl) {
                    savedTeam.logoUrl = organisation.logoUrl;
                    savedTeam = await this.teamService.createOrUpdate(savedTeam);
                    return savedTeam;
                }
                */
            }

            // TODO set up default template
            await this.competitionLadderSettingsService.deleteByCompetitionId(saved.id);
            let ladderSettingsArray = [];
            let cls = new CompetitionLadderSettings();
            cls.competitionId = saved.id;
            cls.resultTypeId = 1
            cls.points = 3;
            ladderSettingsArray.push(cls);
            cls.resultTypeId = 2
            cls.points = 2;
            ladderSettingsArray.push(cls);
            cls.resultTypeId = 3
            cls.points = 1;
            ladderSettingsArray.push(cls);
            cls.resultTypeId = 4
            cls.points = 2;
            ladderSettingsArray.push(cls);
            cls.resultTypeId = 5
            cls.points = 0
            ladderSettingsArray.push(cls);
            cls.resultTypeId = 6
            cls.points = 2;
            ladderSettingsArray.push(cls);
            cls.resultTypeId = 7
            cls.points = 3;
            ladderSettingsArray.push(cls);
            cls.resultTypeId = 8
            cls.points = 2;
            ladderSettingsArray.push(cls);
            cls.resultTypeId = 9
            cls.points = 2
            ladderSettingsArray.push(cls);
            let ladder = await this.competitionLadderSettingsService.batchCreateOrUpdate(ladderSettingsArray)

            return this.competitionService.findById(saved.id);

        } else {
            return response.status(200).send(
                {name: 'search_error', message: `Required fields are missing`});
        }
        } catch(err) {
            return response.send(`An error occured while creating competition ${err}`)
        }
    }

    @Authorized()
    @Post('/admin')
    async loadAdmin(
        @HeaderParam("authorization") user: User,
        @Body() requestFilter: RequestFilter,
        @QueryParam('organisationId') organisationId: number,
        @Res() response: Response
    ): Promise<any> {
        if (requestFilter) {
            return this.competitionService.loadAdmin(user.id, requestFilter, organisationId);
        } else {
            return response.status(200).send(
                {name: 'search_error', message: `Required fields are missing`});
        }
    }

    @Get('/hierarchy')
    async loadHierarchy(
        @QueryParam('organisationName') organisationName: string,
        @QueryParam('teamName') teamName: string,
        @QueryParam('competitionId') competitionId: number): Promise<{ organisations: Organisation[], teams: Team[] }> {

        const organisations = await this.organisationService.findByNameAndCompetitionId(organisationName, competitionId);
        const teams = await this.teamService.findByNameAndCompetition(teamName, competitionId);

        return {organisations, teams};
    }

    /**
     * Gets a list of competitions, organisations, teams or players based on ids provided
     *
     * @deprecated since 3.0.2; use entities instead
     * @return {competitions, organisations, teams, players}.
     */
    @Get('/watchlist')
    async watchlist(
        @QueryParam('competitionIds') competitionIds: number[],
        @QueryParam('organisationIds') organisationIds: number[],
        @QueryParam('teamIds') teamIds: number[],
        @QueryParam('playerIds') playerIds: number[]
    ): Promise<{ competitions: Competition[], organisations: Organisation[], teams: Team[], players: Player[] }> {

        const competitions = await this.competitionService.findByIds(competitionIds);
        const organisations = await this.organisationService.findByIds(organisationIds);
        const teams = await this.teamService.findByIds(teamIds);
        const players = await this.playerService.findByIds(playerIds);

        return {competitions, organisations, teams, players};
    }

    @Get('/entities')
    async entities(
        @QueryParam('competitionIds') competitionIds: number[],
        @QueryParam('organisationIds') organisationIds: number[],
        @QueryParam('teamIds') teamIds: number[],
        @QueryParam('playerIds') playerIds: number[]
    ): Promise<{ competitions: Competition[], organisations: Organisation[], teams: Team[], players: Player[] }> {

        const competitions = await this.competitionService.findByIds(competitionIds);
        const organisations = await this.organisationService.findByIds(organisationIds);
        const teams = await this.teamService.findByTeamIds(teamIds);
        const players = await this.playerService.findByIds(playerIds);

        return {competitions, organisations, teams, players};
    }

    @Authorized()
    @Get('/ladderSettings')
    async getLadderSettings(
        @Body() ladderSettings: CompetitionLadderSettings[],
        @QueryParam('competitionId') competitionId: number
    ) {
        return await this.competitionLadderSettingsService.getByCompetitionId(competitionId);
    }

    @Authorized()
    @Post('/ladderSettings')
    async ladderSettings(
        @Body() ladderSettings: CompetitionLadderSettings[],
        @QueryParam('competitionId') competitionId: number
    ) {

        await this.competitionLadderSettingsService.deleteByCompetitionId(competitionId);
        let ladderSettingsArray = [];
        for (let i of ladderSettings) {
            let cls = new CompetitionLadderSettings();
            cls.competitionId = competitionId;
            cls.resultTypeId = i.resultTypeId;
            cls.points = i.points;
            ladderSettingsArray.push(cls);
        }
        let data = await this.competitionLadderSettingsService.batchCreateOrUpdate(ladderSettingsArray)
        return data;

    }

    @Authorized()
    @Get('/venueCourt')
    async findVenueCourt(
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('name') name: string
    ) {
        return await this.competitionVenueService.findByCourtName(name, competitionId);
    }

    @Get('/list')
    async getCompetitions(
        @QueryParam('organisationId') organisationId: number,
        @QueryParam('organisationUniqueKey') organisationUniqueKey: string) {
        if (organisationUniqueKey !== null && organisationUniqueKey !== undefined) {
            organisationId = await this.organisationService.findByUniqueKey(organisationUniqueKey);
        }
        return await this.competitionService.getCompetitionsPublic(organisationId);
    }
}
