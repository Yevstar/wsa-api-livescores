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
import { isPhoto, fileExt, stringTONumber, stringToBoolean, timestamp, uuidv4 } from "../utils/Utils"


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
        @Body() competition: Competition,
        @UploadedFile("logo") file: Express.Multer.File,
        @Res() response: Response
    ): Promise<any> {
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
    @QueryParam('organisationId',{required:true}) organisationId: number) {
      return await this.competitionService.getCompetitionsPublic(organisationId);
    }
}
