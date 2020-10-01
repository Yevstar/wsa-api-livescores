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
import {LinkedCompetitionOrganisation} from "../models/LinkedCompetitionOrganisation";
import {Player} from "../models/Player";
import {User} from "../models/User";
import {BaseController} from "./BaseController";
import {RequestFilter} from "../models/RequestFilter";
import { CompetitionVenue } from "../models/CompetitionVenue";
import { isPhoto, fileExt, stringTONumber, stringToBoolean, timestamp, uuidv4, isArrayPopulated, isNotNullAndUndefined } from "../utils/Utils"
import { CompetitionOrganisation } from "../models/CompetitionOrganisation";
import { logger } from "../logger";
import { LadderFormat } from "../models/LadderFormat";
import { LadderFormatDivision } from "../models/LadderFormatDivision";
import { RequestFilterCompetitionDashboard } from "../services/CompetitionService";
import {CompetitionInvitees} from '../models/CompetitionInvitees';

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

        if (stringToBoolean(competition.positionTracking) == true && competition.attendanceRecordingPeriod == 'MATCH') {
            return response.status(212).send(
                {name: 'save_error', message: `Attendance recording must be set to periods or minutes if position tracking is enabled.`});
        }

        try {
            if (competition) {
                let isNewCompetition = false;
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
                c.yearRefId = competition.yearRefId;
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
                c.playerBorrowingType = competition.playerBorrowingType;
                c.gamesBorrowedThreshold = competition.gamesBorrowedThreshold;
                c.linkedCompetitionId = competition.linkedCompetitionId;
                c.gameTimeTrackingType = stringTONumber(competition.gameTimeTrackingType);

                if(c.id===0){
                    c.uniqueKey = uuidv4();
                    isNewCompetition = true;
                }

                let saved = await this.competitionService.createOrUpdate(c);

                if (isNotNullAndUndefined(competition.invitedTo) && competition.invitedTo !== '') {
                    competition.invitedTo = JSON.parse(competition.invitedTo)
                }

                if (isNotNullAndUndefined(competition.invitedAnyAssoc) && competition.invitedAnyAssoc !== '') {
                    competition.invitedAnyAssoc = JSON.parse(competition.invitedAnyAssoc)
                }

                if (isNotNullAndUndefined(competition.invitedAnyClub) && competition.invitedAnyClub !== '') {
                    competition.invitedAnyClub = JSON.parse(competition.invitedAnyClub)
                }

                const getInviteesDetail = await this.competitionInviteesService.getInviteesByCompetition(saved.id);

                if ((isNotNullAndUndefined(competition.invitedTo) && competition.invitedTo !== '' && isArrayPopulated(competition.invitedTo)) ||
                    (isNotNullAndUndefined(competition.invitedAnyAssoc) && competition.invitedAnyAssoc !== '' && isArrayPopulated(competition.invitedAnyAssoc)) ||
                    (isNotNullAndUndefined(competition.invitedAnyClub) && competition.invitedAnyClub !== '' && isArrayPopulated(competition.invitedAnyClub))) {

                    let affliliateInvited = 0;
                    const INVITED_TO = competition.invitedTo;
                    let GET_ORGANISATIONS = [];
                    let invitationTo;

                    const MULTIPLE_ORGANISATIONS = [];
                    const ORG_ARRAY = [];
                    const CREATE_COMP_ORG = [];
                    const COMPETITION_INVITEES = [];

                    const AFFILIATED_ASSOCIATION = Competition.AFFILIATED_ASSOCIATION;
                    const AFFILIATED_CLUB = Competition.AFFILIATED_CLUB;
                    const ANY_ASSOCIATION = Competition.ANY_ORGANISATION_ASSOCIATION;
                    const ANY_CLUB = Competition.ANY_ORGANISATION_CLUB;
                    const DIRECT = Competition.DIRECT_INVITE;
                    const NOT_APPLICABLE = Competition.NOT_APPLICABLE;

                    if (competition.isInvitorsChanged === 'true') {

                    if (isArrayPopulated(INVITED_TO)) {

                        const getInvitationDetails = await this.competitionInviteesService.getInviteesByCompetition(saved.id);
                        if (isArrayPopulated(getInvitationDetails)) {
                            for (let i of getInvitationDetails) {
                                await this.competitionInviteesService.deleteById(i.id);
                            }
                        }

                        if (INVITED_TO.includes(NOT_APPLICABLE)) {

                            if (isArrayPopulated(getInviteesDetail)) {
                                await this.competitionInviteesService.deleteInviteesByCompetitionId(saved.id);
                            }
                            
                            const compInv = new CompetitionInvitees();
                            compInv.id = 0;
                            compInv.inviteesRefId = NOT_APPLICABLE;
                            compInv.competitionId = saved.id;
                            compInv.invitedOrganisationId = null;
                            await this.competitionInviteesService.createOrUpdate(compInv);

                        } else if ((INVITED_TO.includes(AFFILIATED_ASSOCIATION) || INVITED_TO.includes(AFFILIATED_CLUB))
                            && (INVITED_TO.includes(ANY_ASSOCIATION) || INVITED_TO.includes(ANY_CLUB))) {

                            if (INVITED_TO.includes(AFFILIATED_ASSOCIATION) && (!INVITED_TO.includes(AFFILIATED_CLUB))) { // Association selected
                                affliliateInvited = 3;
                                invitationTo = 2;
                            } else if (INVITED_TO.includes(AFFILIATED_CLUB) && (!INVITED_TO.includes(AFFILIATED_ASSOCIATION))) { // Club selected
                                affliliateInvited = 4;
                                invitationTo = 3;
                            }

                            const organisationTypeRefId = await this.organisationService.findAffiliateDetailsByOrganisationId(competition.organisationId)
                            GET_ORGANISATIONS = await this.competitionService.getAllAffiliatedOrganisations(competition.organisationId, affliliateInvited, organisationTypeRefId);

                            if (isArrayPopulated(getInviteesDetail)) {
                                await this.competitionInviteesService.deleteInviteesByCompetitionId(saved.id);
                            }

                            for (let i of GET_ORGANISATIONS) {
                                const compInvAffiliates = new CompetitionInvitees();
                                compInvAffiliates.id = 0;
                                compInvAffiliates.competitionId = saved.id;
                                compInvAffiliates.inviteesRefId = invitationTo;
                                compInvAffiliates.invitedOrganisationId = i.organisationId;
                                COMPETITION_INVITEES.push(compInvAffiliates)
                            }

                            if (isNotNullAndUndefined(competition.invitedAnyAssoc)) {
                                MULTIPLE_ORGANISATIONS.push(...GET_ORGANISATIONS, ...competition.invitedAnyAssoc);

                                for (let i of competition.invitedAnyAssoc) {
                                    const compInvAnyAssoc = new CompetitionInvitees();
                                    compInvAnyAssoc.id = 0;
                                    compInvAnyAssoc.competitionId = saved.id;
                                    compInvAnyAssoc.inviteesRefId = ANY_ASSOCIATION;
                                    compInvAnyAssoc.invitedOrganisationId = i.organisationId;
                                    COMPETITION_INVITEES.push(compInvAnyAssoc)
                                }

                            }

                            if (isNotNullAndUndefined(competition.invitedAnyClub)) {
                                MULTIPLE_ORGANISATIONS.push(...GET_ORGANISATIONS, ...competition.invitedAnyClub);

                                for (let i of competition.invitedAnyClub) {
                                    const compInvAnyClub = new CompetitionInvitees();
                                    compInvAnyClub.id = 0;
                                    compInvAnyClub.competitionId = saved.id;
                                    compInvAnyClub.inviteesRefId = ANY_CLUB;
                                    compInvAnyClub.invitedOrganisationId = i.organisationId;
                                    COMPETITION_INVITEES.push(compInvAnyClub);
                                }

                            }

                            if (!((isNotNullAndUndefined(competition.invitedAnyClub)) && (isNotNullAndUndefined(competition.invitedAnyAssoc)))) {
                                MULTIPLE_ORGANISATIONS.push(...GET_ORGANISATIONS);
                            }

                            ORG_ARRAY.push(...MULTIPLE_ORGANISATIONS);

                        } else {

                            if (INVITED_TO.includes(AFFILIATED_ASSOCIATION) && (!INVITED_TO.includes(AFFILIATED_CLUB, DIRECT, ANY_ASSOCIATION, ANY_CLUB))) { // Association selected
                                affliliateInvited = 3;
                                invitationTo = AFFILIATED_ASSOCIATION;
                            } else if (INVITED_TO.includes(AFFILIATED_CLUB) && (!INVITED_TO.includes(AFFILIATED_ASSOCIATION, DIRECT, ANY_ASSOCIATION, ANY_CLUB))) { // Club selected
                                affliliateInvited = 4;
                                invitationTo = AFFILIATED_CLUB;
                            }

                            const organisationTypeRefId = await this.organisationService.findAffiliateDetailsByOrganisationId(competition.organisationId)
                            GET_ORGANISATIONS = await this.competitionService.getAllAffiliatedOrganisations(competition.organisationId, affliliateInvited, organisationTypeRefId);

                            if (isArrayPopulated(getInviteesDetail)) {
                                await this.competitionInviteesService.deleteInviteesByCompetitionId(saved.id);
                            }

                            if (INVITED_TO.includes(DIRECT) && (!INVITED_TO.includes(AFFILIATED_ASSOCIATION, AFFILIATED_CLUB, ANY_ASSOCIATION, ANY_CLUB))) { // Direct Invited
                                invitationTo = DIRECT;
                                GET_ORGANISATIONS = [{ organisationId: competition.organisationId }];
                            }

                            if (INVITED_TO.includes(ANY_ASSOCIATION) && isNotNullAndUndefined(competition.invitedAnyAssoc) && isArrayPopulated(competition.invitedAnyAssoc)) { // Any Organisation Invited
                                invitationTo = ANY_ASSOCIATION;
                                const GET_ANY_ORGANISATIONS = [];
                                if ((INVITED_TO.includes(ANY_ASSOCIATION) || INVITED_TO.includes(ANY_CLUB)) && (!INVITED_TO.includes(DIRECT))) {
                                    GET_ANY_ORGANISATIONS.push(...competition.invitedAnyAssoc);
                                }

                                for (let i of GET_ANY_ORGANISATIONS) {
                                    const compInv = new CompetitionInvitees();
                                    compInv.id = 0;
                                    compInv.inviteesRefId = invitationTo;
                                    compInv.competitionId = saved.id;
                                    compInv.invitedOrganisationId = i.organisationId;
                                    COMPETITION_INVITEES.push(compInv)

                                    ORG_ARRAY.push(i)
                                }
                            }

                            if (INVITED_TO.includes(ANY_CLUB) && isNotNullAndUndefined(competition.invitedAnyClub) && isArrayPopulated(competition.invitedAnyClub)) { // Any Organisation Invited
                                invitationTo = ANY_CLUB;
                                const GET_ANY_ORGANISATIONS = [];
                                if ((INVITED_TO.includes(ANY_ASSOCIATION) || INVITED_TO.includes(ANY_CLUB)) && (!INVITED_TO.includes(DIRECT))) {
                                    GET_ANY_ORGANISATIONS.push(...competition.invitedAnyClub);
                                }

                                for (let i of GET_ANY_ORGANISATIONS) {
                                    const compInv = new CompetitionInvitees();
                                    compInv.id = 0;
                                    compInv.inviteesRefId = invitationTo;
                                    compInv.competitionId = saved.id;
                                    compInv.invitedOrganisationId = i.organisationId;
                                    COMPETITION_INVITEES.push(compInv)
                                    ORG_ARRAY.push(i)
                                }
                            }

                            if(!((isNotNullAndUndefined(competition.invitedAnyAssoc) && isArrayPopulated(competition.invitedAnyAssoc))
                            && (isNotNullAndUndefined(competition.invitedAnyClub) && isArrayPopulated(competition.invitedAnyClub)))
                            && isArrayPopulated(GET_ORGANISATIONS)) {
                                
                                for (let i of GET_ORGANISATIONS) {
                                    const compInv = new CompetitionInvitees();
                                    compInv.id = 0;
                                    compInv.inviteesRefId = invitationTo;
                                    compInv.competitionId = saved.id;
                                    compInv.invitedOrganisationId = i.organisationId;
                                    COMPETITION_INVITEES.push(compInv)
                                }
                            }
                                if(isArrayPopulated(GET_ORGANISATIONS)) {
                                    ORG_ARRAY.push(...GET_ORGANISATIONS);
                                }
                        }
                    } else {
                        // delete the existing invitees
                        await this.competitionInviteesService.deleteInviteesByCompetitionId(saved.id);
                    }
                    }

                    if (isArrayPopulated(COMPETITION_INVITEES)) {
                        await this.competitionInviteesService.batchCreateOrUpdate(COMPETITION_INVITEES);
                    }

                    for (let i of ORG_ARRAY) {
                        const compOrg = new CompetitionOrganisation();
                        compOrg.id = 0;
                        compOrg.competitionId = saved.id;
                        compOrg.orgId = i.organisationId;
                        CREATE_COMP_ORG.push(compOrg);
                    }
                    
                    const getExistingOrganisation = await this.competitionOrganisationService.findByCompetitionId(saved.id);

                    const ORG_ID_IN_COMP_ORG = []
                    const ORG_ID_IN_EXISTING_COMP_ORG = []
                    for (let i of CREATE_COMP_ORG) ORG_ID_IN_COMP_ORG.push(i.orgId)
                    for (let i of getExistingOrganisation) ORG_ID_IN_EXISTING_COMP_ORG.push(i.orgId)

                    for (let i of getExistingOrganisation) {
                        if (ORG_ID_IN_COMP_ORG.indexOf(i.orgId) !== -1 && ORG_ID_IN_COMP_ORG.length > 0) {
                            ORG_ID_IN_EXISTING_COMP_ORG.splice(ORG_ID_IN_EXISTING_COMP_ORG.indexOf(i.orgId), 1);
                            ORG_ID_IN_COMP_ORG.splice(ORG_ID_IN_COMP_ORG.indexOf(i.orgId), 1);
                        }
                    }

                    // delete enteries that dont match the current organisation
                    for (let i of ORG_ID_IN_EXISTING_COMP_ORG) {
                        await this.competitionOrganisationService.softDeleteByOrgId(i, saved.id);
                    }

                    const CREATE_COMP_ORGANISATIONS = [];
                    if (ORG_ID_IN_COMP_ORG.length > 0) {
                        for (let i of ORG_ID_IN_COMP_ORG) {
                            const compOrg = new CompetitionOrganisation();
                            compOrg.id = 0;
                            compOrg.competitionId = saved.id;
                            compOrg.orgId = i;
                            CREATE_COMP_ORGANISATIONS.push(compOrg);
                        }
                    }

                    await this.competitionOrganisationService.batchCreateOrUpdate(CREATE_COMP_ORGANISATIONS);
                }else {
                    if (isArrayPopulated(getInviteesDetail)) {
                        await this.competitionInviteesService.deleteInviteesByCompetitionId(saved.id);
                    }
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

                if(isNewCompetition){
                    this.insertIntoLadderSettings(saved,user.id);
                }

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

                return this.competitionService.findById(saved.id);

            } else {
                return response.status(200).send(
                    {name: 'search_error', message: `Required fields are missing`});
            }
        } catch(err) {
            return response.send(`An error occured while creating competition ${err}`)
        }
    }

    private async insertIntoLadderSettings(competition, userId){
        try {
            let ladderFormat = new LadderFormat();
            ladderFormat.id = 0;
            ladderFormat.competitionId = competition.id;
            ladderFormat.createdBy = userId;
            ladderFormat.created_at = new Date();
            ladderFormat.isAllDivision = 1;

            let ladderFormatSave = await this.ladderFormatService.createOrUpdate(ladderFormat);
          //  await this.competitionLadderSettingsService.deleteByCompetitionId(saved.id);
            let ladderSettingsArray = [];
            let cls = new CompetitionLadderSettings();
            cls.competitionId = competition.id;
            cls.resultTypeId = 1
            cls.points = 0;
            cls.ladderFormatId = ladderFormatSave.id;
            cls.createdBy = userId;
            ladderSettingsArray.push(cls);
            let cls2 = new CompetitionLadderSettings();
            cls2.competitionId = competition.id;
            cls2.resultTypeId = 2
            cls2.points = 0;
            cls2.ladderFormatId = ladderFormatSave.id;
            cls2.createdBy = userId;
            ladderSettingsArray.push(cls2);
            let cls3 = new CompetitionLadderSettings();
            cls3.competitionId = competition.id;
            cls3.resultTypeId = 3
            cls3.points = 0;
            cls3.ladderFormatId = ladderFormatSave.id;
            cls3.createdBy = userId;
            ladderSettingsArray.push(cls3);
            let cls4 = new CompetitionLadderSettings();
            cls4.competitionId = competition.id;
            cls4.resultTypeId = 4
            cls4.points = 0;
            cls4.ladderFormatId = ladderFormatSave.id;
            cls4.createdBy = userId;
            ladderSettingsArray.push(cls4);
            let cls5 = new CompetitionLadderSettings();
            cls5.competitionId = competition.id;
            cls5.resultTypeId = 5
            cls5.points = 0
            cls5.ladderFormatId = ladderFormatSave.id;
            cls5.createdBy = userId;
            ladderSettingsArray.push(cls5);
            let cls6 = new CompetitionLadderSettings();
            cls6.competitionId = competition.id;
            cls6.resultTypeId = 6
            cls6.points = 0;
            cls6.ladderFormatId = ladderFormatSave.id;
            cls6.createdBy = userId;
            ladderSettingsArray.push(cls6);
            let cls7 = new CompetitionLadderSettings();
            cls7.competitionId = competition.id;
            cls7.resultTypeId = 7
            cls7.points = 0;
            cls7.ladderFormatId = ladderFormatSave.id;
            cls7.createdBy = userId;
            ladderSettingsArray.push(cls7);
            let cls8 = new CompetitionLadderSettings();
            cls8.competitionId = competition.id;
            cls8.resultTypeId = 8
            cls8.points = 0;
            cls8.ladderFormatId = ladderFormatSave.id;
            cls8.createdBy = userId;
            ladderSettingsArray.push(cls8);
            let cls9 = new CompetitionLadderSettings();
            cls9.competitionId = competition.id;
            cls9.resultTypeId = 9
            cls9.points = 0;
            cls9.ladderFormatId = ladderFormatSave.id;
            cls9.createdBy = userId;
            ladderSettingsArray.push(cls9);
            await this.competitionLadderSettingsService.batchCreateOrUpdate(ladderSettingsArray)
        } catch (error) {
            throw error;
        }
    }

    @Authorized()
    @Post('/admin')
    async loadAdmin(
        @HeaderParam("authorization") user: User,
        @Body() requestFilter: RequestFilter,
        @QueryParam('organisationId') organisationId: number,
        @QueryParam('recordUmpireType') recordUmpireType: "NONE" | "NAMES" | "USERS",
        @Res() response: Response,
        @QueryParam('yearRefId') yearRefId?: number,
        @QueryParam('sortBy') sortBy: string = undefined,
        @QueryParam('sortOrder') sortOrder: "ASC" | "DESC" = undefined,
    ): Promise<any> {
        return this.competitionService.loadAdmin(user.id, requestFilter, organisationId, recordUmpireType, yearRefId, sortBy, sortOrder);
    }

    @Get('/hierarchy')
    async loadHierarchy(
        @QueryParam('organisationName') organisationName: string,
        @QueryParam('teamName') teamName: string,
        @QueryParam('competitionId') competitionId: number): Promise<{ competitionOrganisations: LinkedCompetitionOrganisation[], teams: Team[] }> {

        const competitionOrganisations = await this.organisationService.findByNameAndCompetitionId(organisationName, competitionId);
        const teams = await this.teamService.findByNameAndCompetition(teamName, competitionId);

        return {competitionOrganisations, teams};
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
    ): Promise<{ competitions: Competition[], competitionOrganisations: LinkedCompetitionOrganisation[], teams: Team[], players: Player[] }> {

        const competitions = await this.competitionService.findByIds(competitionIds);
        const competitionOrganisations = await this.organisationService.findByIds(organisationIds);
        const teams = await this.teamService.findByIds(teamIds);
        const players = await this.playerService.findByIds(playerIds);

        return {competitions, competitionOrganisations, teams, players};
    }

    @Get('/entities')
    async entities(
        @QueryParam('competitionIds') competitionIds: number[],
        @QueryParam('organisationIds') organisationIds: number[],
        @QueryParam('teamIds') teamIds: number[],
        @QueryParam('playerIds') playerIds: number[]
    ): Promise<{ competitions: Competition[], competitionOrganisations: LinkedCompetitionOrganisation[], teams: Team[], players: Player[] }> {

        const competitions = await this.competitionService.findByIds(competitionIds);
        const competitionOrganisations = await this.organisationService.findByIds(organisationIds);
        const teams = await this.teamService.findByTeamIds(teamIds);
        const players = await this.playerService.findByIds(playerIds);

        return {competitions, competitionOrganisations, teams, players};
    }

    @Authorized()
    @Get('/ladderSettings')
    async getLadderSettings(
        @HeaderParam("authorization") currentUser: User,
        @QueryParam('competitionId') competitionUniqueKey: string,
        @Res() response: Response
    ) {
        try {
            let competitionId = await this.competitionService.findByUniquekey(competitionUniqueKey);

            return await this.competitionLadderSettingsService.getLadderSettings(competitionId);
        } catch (error) {
            logger.error(`Error Occurred in  getLadderSettingse   ${currentUser.id}` + error);
                return response.status(500).send({
                    message: 'Something went wrong. Please contact administrator'
                });
        }

    }

    @Authorized()
    @Post('/ladderSettings')
    async ladderSettings(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody: any,
        @QueryParam('competitionId') competitionUniqueKey: string,
        @Res() response: Response
    ) {
        try{
            if(isArrayPopulated(requestBody)){
                let competitionId = await this.competitionService.findByUniquekey(competitionUniqueKey);
                let ladderFormatFromDb = await this.ladderFormatService.findByCompetitionId(competitionId);
                let ladderFormatMap = new Map();
                for(let item of requestBody){
                    let ladderFormat = new LadderFormat();
                    ladderFormat.id = item.ladderFormatId;
                    ladderFormat.isAllDivision = item.isAllDivision;
                    ladderFormat.competitionId = competitionId;
                    if(item.ladderFormatId!= null && item.ladderFormatId!= 0){
                        ladderFormat.updatedBy = currentUser.id;
                        ladderFormat.updated_at = new Date();
                    }
                    else {
                        ladderFormat.createdBy = currentUser.id;
                        ladderFormat.created_at = new Date();
                    }

                    if(ladderFormat.isAllDivision == 1){
                        item.selectedDivisions = [];
                    }

                    ladderFormatMap.set(item.ladderFormatId, ladderFormat);

                    let ladderFormatSave = await this.ladderFormatService.createOrUpdate(ladderFormat);

                    let laddeerFormDivFromDB = await this.ladderFormatDivisionService.findByLadderFormatId(ladderFormatSave.id);

                    // Ladder Format Division
                    let ladderDivisionTemp = []; let ladderDivisionMap = new Map();
                    if(isArrayPopulated(item.selectedDivisions)){
                        for(let divisionId of item.selectedDivisions){
                            let ladderDivision = new LadderFormatDivision();
                            ladderDivision.id = 0;
                            ladderDivision.divisionId = divisionId;
                            ladderDivision.ladderFormatId = ladderFormatSave.id;
                            ladderDivision.createdBy = currentUser.id;
                            ladderDivision.created_at = new Date();
                            ladderDivisionMap.set(divisionId, ladderDivision);
                            ladderDivisionTemp.push(ladderDivision);
                        }

                        if(isArrayPopulated(laddeerFormDivFromDB)){
                            for(let division of laddeerFormDivFromDB){
                                let divisionData = ladderDivisionMap.get(division.divisionId);
                                if(divisionData == undefined){
                                    division.deleted_at = new Date()
                                    division.updatedBy = currentUser.id;
                                    division.updated_at = new Date();
                                    ladderDivisionTemp.push(division);
                                }
                                else{
                                    divisionData.id = division.id;
                                    divisionData.createdBy = division.createdBy;
                                    divisionData.created_at = division.created_at;
                                    divisionData.updatedBy = currentUser.id;
                                    divisionData.updated_at = new Date();
                                }
                            }
                        }
                    }
                    else{
                        if(isArrayPopulated(laddeerFormDivFromDB)){
                            for(let div of laddeerFormDivFromDB){
                                div.updatedBy = currentUser.id;
                                div.updated_at  = new Date();
                                div.deleted_at = new Date();
                                ladderDivisionTemp.push(div);
                            }
                        }
                    }

                    if(isArrayPopulated(ladderDivisionTemp)){
                        await this.ladderFormatDivisionService.batchCreateOrUpdate(ladderDivisionTemp);
                    }

                    // Competition Ladder settings
                    let settingsArr = [];
                    if(isArrayPopulated(item.settings)){
                        for(let setting of item.settings){
                            let compSetting = new CompetitionLadderSettings();
                            compSetting.id = setting.id;
                            compSetting.competitionId = competitionId;
                            compSetting.ladderFormatId = ladderFormatSave.id;
                            compSetting.points = setting.points;
                            compSetting.resultTypeId = setting.resultTypeId;
                            if(setting.id!= null && setting.id!= 0){
                                compSetting.updatedBy = currentUser.id;
                                compSetting.updated_at = new Date();
                            }
                            else{
                                compSetting.createdBy = currentUser.id;
                                compSetting.created_at = new Date();
                            }

                            settingsArr.push(compSetting);
                        }

                        await this.competitionLadderSettingsService.batchCreateOrUpdate(settingsArr);
                    }
                }

                if(isArrayPopulated(ladderFormatFromDb)){
                    let ladderFormatArr = [];
                    let ladderFormatDivArr = [];
                    for(let item of ladderFormatFromDb){
                        if(ladderFormatMap.get(item.id) == undefined){
                            item.updated_at = new Date();
                            item.updatedBy = currentUser.id;
                            item.deleted_at = new Date();
                            ladderFormatArr.push(item);

                            let laddeerFormDivFromDB = await this.ladderFormatDivisionService.findByLadderFormatId(item.id);
                            if(isArrayPopulated(laddeerFormDivFromDB)){
                                for(let div of laddeerFormDivFromDB){
                                    div.updated_at = new Date();
                                    div.updatedBy = currentUser.id;
                                    div.deleted_at = new Date();
                                    ladderFormatDivArr.push(div);
                                }
                            }
                            console.log("item.id" + item.id);
                            await this.competitionLadderSettingsService.deleteByLadderFormatId(item.id);
                        }
                    }

                    await this.ladderFormatService.batchCreateOrUpdate(ladderFormatArr);
                    await this.ladderFormatDivisionService.batchCreateOrUpdate(ladderFormatDivArr);
                }

                return response.status(200).send({message: "Successfully Updated"});
            }
            else{
                return response.status(212).send({ message: 'Empty Body'});
            }
        }
        catch(error){
            logger.error(`Error Occurred in  save LadderSettings   ${currentUser.id}` + error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }

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
        @QueryParam('yearRefId') yearRefId: number,
        @QueryParam('organisationUniqueKey') organisationUniqueKey: string) {
        if (organisationUniqueKey !== null && organisationUniqueKey !== undefined) {
            organisationId = await this.organisationService.findByUniqueKey(organisationUniqueKey);
        }
        return await this.competitionService.getCompetitionsPublic(organisationId, yearRefId);
    }

    @Authorized()
    @Post('/adminDashboard')
    async loadAdminDashboard(
        @HeaderParam("authorization") user: User,
        @Body() requestFilter: RequestFilterCompetitionDashboard,
        @QueryParam('organisationId') organisationId: number,
        @QueryParam('yearRefId') yearRefId?: number,
        @QueryParam('sortBy') sortBy: string = undefined,
        @QueryParam('sortOrder') sortOrder: "ASC" | "DESC" = undefined,
    ): Promise<any> {
        return this.competitionService.loadDashboardOwnedAndParticipatingCompetitions(user.id, requestFilter, organisationId, yearRefId, sortBy, sortOrder);
    }
}
