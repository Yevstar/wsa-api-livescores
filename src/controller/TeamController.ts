import { Get, Delete, Param, JsonController, QueryParam, Post, Authorized, HeaderParam, Body, Res, UploadedFile, } from 'routing-controllers';
import { Request, Response } from 'express';
import { Team } from '../models/Team';
import { Player } from '../models/Player'
import { TeamLadder } from "../models/views/TeamLadder";
import { BaseController } from "./BaseController";
import {User} from "../models/User";
import { UserRoleEntity } from "../models/security/UserRoleEntity";
import { Role } from "../models/security/Role";
import { EntityType } from "../models/security/EntityType";
import { isArrayEmpty, isNullOrEmpty, isPhoto, fileExt, md5, stringTONumber } from "../utils/Utils"
import {logger} from '../logger';

@JsonController('/teams')
export class TeamController extends BaseController {

    @Get('/id/:id')
    async get(@Param("id") id: number) {
        return this.teamService.findTeamWithUsers(id);
    }

    @Authorized()
    @Get('/details')
    async getFullTeamDetail(
      @QueryParam("teamId") teamId: number,
      @QueryParam("clubId") clubId: number,
      @QueryParam("competitionId") competitionId: number,
      @QueryParam("teamName") teamName: string,
    ): Promise<Team[]> {
      return this.teamService.findTeams(
        teamId,
        clubId,
        competitionId,
        teamName
      );
    }

    @Authorized()
    @Delete('/id/:id')
    async delete(
        @Param("id") id: number,
        @HeaderParam("authorization") user: User)
    {
        return this.teamService.softDelete(id, user.id);
    }

    @Get('/list')
    async listCompetitionTeams(
        @QueryParam('competitionId') competitionId: number
    ): Promise<Team[]> {
        return this.teamService.findTeamsWithUsers(competitionId);
    }

    @Get('/')
    async find(
        @QueryParam('name') name: string,
        @QueryParam('competitionId') competitionId: number
    ): Promise<Team[]> {
        return this.teamService.findByNameAndCompetition(name, competitionId);
    }

    @Get('/ladder')
    async loadTeamLadder(
        @QueryParam('name') name: string,
        @QueryParam('teamIds') teamIds: number[],
        @QueryParam('divisionIds') divisionIds: number[],
        @QueryParam('competitionIds') competitionIds: number[],
    ): Promise<TeamLadder[]> {
        if (teamIds && !Array.isArray(teamIds)) teamIds = [teamIds];
        if (divisionIds && !Array.isArray(divisionIds)) divisionIds = [divisionIds];
        if (competitionIds && !Array.isArray(competitionIds)) competitionIds = [competitionIds];
        return this.teamService.loadLadder(name, teamIds, divisionIds, competitionIds);
    }

    @Authorized()
    @Post('/invite')
    async getPlayerList(
        @HeaderParam("authorization") user: User,
        @QueryParam('teamIds') teamIds: number[],
        @QueryParam('playerIds') playerIds: number[],
        @QueryParam('isInviteToParents') isInviteToParents: boolean,
    ): Promise<Player[]> {
        logger.info(`TeamController - invite : teamIds ${teamIds}, playerIds ${playerIds} from user (id: ${user.id.toString()} firstName: ${user.firstName} lastName: ${user.lastName})`);
        if (isArrayEmpty(playerIds)) {
            logger.info('Fetching playerData via playerIds');
            let playersData = await this.teamService.getPlayerDataByPlayerIds(playerIds);
            for (let i of playersData) {
                this.teamService.sendInviteMail(user, i, isInviteToParents);
                i.inviteStatus = "INVITED";
                this.playerService.createOrUpdate(i);
            }
            return playersData;
        } else if (isArrayEmpty(teamIds)) {
            logger.info('Fetching playerData via teamIds');
            let playerList = await this.teamService.playerListByTeamId(teamIds);
            for (let i of playerList) {
                this.teamService.sendInviteMail(user, i, isInviteToParents);
                i.inviteStatus = "INVITED";
                this.playerService.createOrUpdate(i);
            }
            return playerList;
        } else return [];
    }

    @Authorized()
    @Post('/add')
    async addTeam(
        @HeaderParam("authorization") user: User,
        @Body() teamData: any,
        @UploadedFile("logo") file: Express.Multer.File,
        @Res() response: Response
    ) {

        if (isNullOrEmpty(teamData.name) || isNullOrEmpty(teamData.competitionId) || isNullOrEmpty(teamData.divisionId)) {
            return response
                .status(422)
                .send({ name: 'validation_error', message: 'Not all required fields filled' });
        } 

        if (!teamData.id) {
            const existing = await this.teamService.findByNameAndCompetition(teamData.name, teamData.competitionId);
            if (existing.length > 0) {
                logger.info(`Team ${teamData.name} already exists.`);
                return response
                    .status(400).send({
                        name: 'validation_error',
                        message: 'A team with this name already exists.'
                });
            }
        }
        
        let team = new Team();
        if (teamData.id) {
            team.id = stringTONumber(teamData.id);
            await this.ureService.deleteRoleFromTeam(team.id, Role.MANAGER);
        }
        team.name = teamData.name;
        team.alias = teamData.alias;
        team.competitionId = stringTONumber(teamData.competitionId);
        team.divisionId = stringTONumber(teamData.divisionId);
        if (teamData.organisationId) {
            team.organisationId = stringTONumber(teamData.organisationId);
            team.clubId = stringTONumber(teamData.organisationId);
        }

        let savedTeam = await this.teamService.createOrUpdate(team);
        
        let managerIds: number[] = teamData.userIds? JSON.parse(teamData.userIds) : [];
        let savedUser: User;
        let password: string;
        if (teamData.email && teamData.firstName && teamData.lastName && teamData.mobileNumber) {
            let foundUser = await this.userService.findByEmail(teamData.email);
            if (foundUser) {
                if (foundUser.firstName == teamData.firstName && foundUser.lastName == teamData.lastName && foundUser.mobileNumber == teamData.mobileNumber) {
                    managerIds[0] = user.id;
                } else {
                    return response
                    .status(400).send({
                        name: 'validation_error',
                        message: 'A user with this email address already exists however other details do not match'
                    });
                }
            } else {
                let managerInfo = new User();
                managerInfo.firstName = teamData.firstName;
                managerInfo.lastName = teamData.lastName;
                managerInfo.email = teamData.email;
                managerInfo.mobileNumber = teamData.mobileNumber;
                password = Math.random().toString(36).slice(-8);
                managerInfo.password = md5(password);

                savedUser = await this.userService.createOrUpdate(managerInfo);
                logger.info(`Manager ${managerInfo.email} signed up.`);
                managerIds[managerIds.length + 1] = savedUser.id;
            }
            
        } 

        for (let managerId of managerIds) {
            if (managerId != 0) {
                let ure = new UserRoleEntity();
                ure.roleId = Role.MANAGER;
                ure.entityId = savedTeam.id
                ure.entityTypeId = EntityType.TEAM;
                ure.userId = managerId;
                await this.ureService.createOrUpdate(ure);
            }
        }

        if (savedUser) {
            let competitionData = await this.competitionService.findById(savedTeam.competitionId)
            this.userService.sentMail(user, savedTeam, competitionData, 'manager', savedUser, password);
        }

        if (file && isPhoto(file.mimetype)) {
            let filename = `/${savedTeam.name}/team_${savedTeam.id}.${fileExt(file.originalname)}`;
            let result = await this.firebaseService.upload(filename, file);
            if (result) {
                savedTeam.logoUrl = result['url'];
                savedTeam = await this.teamService.createOrUpdate(savedTeam);
                return savedTeam;

            } else {
                return response
                    .status(400).send(
                        { name: 'save_error', message: 'Logo not saved, try again later.' });
            }

        } else {
            let organisation = await this.clubService.findById(savedTeam.organisationId);
            if (organisation.logoUrl) {
                savedTeam.logoUrl = organisation.logoUrl;
                savedTeam = await this.teamService.createOrUpdate(savedTeam);
                return savedTeam;
            }
        }

        
    }

    @Authorized()
    @Post('/import')
    async importTeam(
        @HeaderParam("authorization") user: User,
        @QueryParam('competitionId') competitionId: number,
        @UploadedFile("file", { required: true }) file: Express.Multer.File,
        @Res() response: Response
    ) {
        let bufferString = file.buffer.toString('utf8');
        let arr = bufferString.split('\n');
        var jsonObj = [];
        var headers = arr[0].split(',');
        for (var i = 1; i < arr.length; i++) {
            var data = arr[i].split(',');
            var obj = {};
            for (var j = 0; j < data.length; j++) {
                obj[headers[j].trim()] = data[j].trim();
            }
            jsonObj.push(obj);
        }
        JSON.stringify(jsonObj);
        let queryArr = [];
        for (let i of jsonObj) {
            if (i.name !== '') {
                let divisionData = await this.divisionService.findByName(i.division, competitionId);
                let clubData = await this.clubService.findByNameAndCompetitionId(i.club, competitionId);
                let team = new Team();
                team.name = i.team_name;
                team.logoUrl = i.logo;
                team.competitionId = competitionId;
                if (divisionData.length > 0)
                    team.divisionId = divisionData[0].id; //DivisionData is an array
                if (clubData.length > 0) {
                    team.clubId = clubData[0].id; 
                    team.organisationId = clubData[0].id; 
                }
                queryArr.push(team);
            }
        }
        await this.teamService.batchCreateOrUpdate(queryArr);
        return response.status(200).send({ success: true });
    }
}
