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
import {Club} from "../models/Club";
import {Player} from "../models/Player";
import {User} from "../models/User";
import {BaseController} from "./BaseController";
import {RequestFilter} from "../models/RequestFilter";
import { CompetitionVenue } from "../models/CompetitionVenue";
import { isPhoto, fileExt, stringTONumber, stringToBoolean, timestamp } from "../utils/Utils"


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
                /*let organisation = await this.clubService.findById(savedTeam.organisationId);
                if (organisation.logoUrl) {
                    savedTeam.logoUrl = organisation.logoUrl;
                    savedTeam = await this.teamService.createOrUpdate(savedTeam);
                    return savedTeam;
                }
                */
            }

            return saved;
            
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
        @Res() response: Response
    ): Promise<any> {
        if (requestFilter) {
            return this.competitionService.loadAdmin(user.id, requestFilter);
        } else {
            return response.status(200).send(
                {name: 'search_error', message: `Required fields are missing`});
        }
    }

    @Get('/hierarchy')
    async loadHierarchy(
        @QueryParam('clubName') clubName: string,
        @QueryParam('teamName') teamName: string,
        @QueryParam('competitionId') competitionId: number): Promise<{ clubs: Club[], teams: Team[] }> {

        const clubs = await this.clubService.findByNameAndCompetitionId(clubName, competitionId);
        const teams = await this.teamService.findByNameAndCompetition(teamName, competitionId);

        return {clubs, teams};
    }

    /**
     * Gets a list of competitions, clubs, teams or players based on ids provided
     *
     * @deprecated since 3.0.2; use entities instead
     * @return {competitions, clubs, teams, players}.
     */
    @Get('/watchlist')
    async watchlist(
        @QueryParam('competitionIds') competitionIds: number[],
        @QueryParam('clubIds') clubIds: number[],
        @QueryParam('teamIds') teamIds: number[],
        @QueryParam('playerIds') playerIds: number[]
    ): Promise<{ competitions: Competition[], clubs: Club[], teams: Team[], players: Player[] }> {

        const competitions = await this.competitionService.findByIds(competitionIds);
        const clubs = await this.clubService.findByIds(clubIds);
        const teams = await this.teamService.findByIds(teamIds);
        const players = await this.playerService.findByIds(playerIds);

        return {competitions, clubs, teams, players};
    }

    @Get('/entities')
    async entities(
        @QueryParam('competitionIds') competitionIds: number[],
        @QueryParam('clubIds') clubIds: number[],
        @QueryParam('teamIds') teamIds: number[],
        @QueryParam('playerIds') playerIds: number[]
    ): Promise<{ competitions: Competition[], clubs: Club[], teams: Team[], players: Player[] }> {

        const competitions = await this.competitionService.findByIds(competitionIds);
        const clubs = await this.clubService.findByIds(clubIds);
        const teams = await this.teamService.findByIds(teamIds);
        const players = await this.playerService.findByIds(playerIds);

        return {competitions, clubs, teams, players};
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
}
