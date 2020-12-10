import {
    Get,
    Delete,
    Param,
    JsonController,
    QueryParam,
    Post,
    Authorized,
    HeaderParam,
    Body,
    Res,
    UploadedFile,
} from "routing-controllers";
import { Response } from "express";
import admin from "firebase-admin";
import * as fastcsv from "fast-csv";

import { Team } from "../models/Team";
import { Player } from "../models/Player"
import { TeamLadder } from "../models/TeamLadder";
import { BaseController } from "./BaseController";
import { User } from "../models/User";
import { UserRoleEntity } from "../models/security/UserRoleEntity";
import { Role } from "../models/security/Role";
import { EntityType } from "../models/security/EntityType";
import {
    isArrayPopulated,
    isNullOrEmpty,
    isPhoto,
    fileExt,
    md5,
    stringTONumber,
    paginationData,
    isNotNullAndUndefined,
    validationForField,
    arrangeCSVToJson,
    trim
} from "../utils/Utils"
import { logger } from "../logger";
import { CommunicationTrack } from '../models/CommunicationTrack';


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
        @QueryParam("competitionOrganisationId") competitionOrganisationId: number,
        @QueryParam("competitionId") competitionId: number,
        @QueryParam("teamName") teamName: string,
    ): Promise<Team[]> {
        let teamsList = await this.teamService.findTeams(
            teamId,
            competitionOrganisationId,
            competitionId,
            teamName
        );

        await Promise.all(teamsList.map((team: Team) => {
            return this.checkTeamFirestoreDatabase(team);
        }));

        return teamsList;
    }

    @Authorized()
    @Delete('/id/:id')
    async delete(
        @Param("id") id: number,
        @HeaderParam("authorization") user: User
    ) {
        this.deleteTeamFirestoreDatabase(id);
        const deletdUREs = await this.ureService.deleteTeamUre(id, user.id);
        await Promise.all(deletdUREs.map((ure: UserRoleEntity) => {
            if (ure.userId != null || ure.userId != undefined) {
                return this.notifyChangeRole(ure.userId);
            }
        }));
        return this.teamService.softDelete(id, user.id);
    }

    @Get('/list')
    async listCompetitionTeams(
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('competitionOrganisationId') competitionOrganisationId: number,
        @QueryParam('divisionId') divisionId: number,
        @QueryParam('includeBye') includeBye: number = 0,
        @QueryParam('search') search: string,
        @QueryParam('sortBy') sortBy: string = undefined,
        @QueryParam('sortOrder') sortOrder: "ASC" | "DESC" = undefined,
        @QueryParam('offset') offset: number,
        @QueryParam('limit') limit: number
    ): Promise<any> {

        if (search === undefined || search === null) search = '';
        if (offset === undefined || offset === null || limit === undefined || limit === null) {
            limit = 0;
            offset = 0;
        }

        const teamData = await this.teamService.findTeamsWithUsers(
            competitionId,
            competitionOrganisationId,
            divisionId,
            includeBye,
            search,
            offset,
            limit,
            sortBy,
            sortOrder
        );

        if (offset === 0 && limit === 0) {
            return teamData.teams;
        } else {
            return { page: paginationData(parseInt(teamData.teamCount), limit, offset), teams: teamData.teams };
        }
    }

    @Get('/')
    async find(
        @QueryParam('name') name: string,
        @QueryParam('competitionId') competitionId: number
    ): Promise<Team[]> {
        return this.teamService.findByNameAndCompetition(name, competitionId);
    }

    @Get('/ladder')
    async loadTeamLadderDetails(
        @QueryParam('name') name: string,
        @QueryParam('teamIds') teamIds: number[],
        @QueryParam('divisionIds') divisionIds: number[],
        @QueryParam('competitionIds') competitionIds: number[],
        @QueryParam('competitionKey') competitionUniqueKey: string,
    ): Promise<any> {
        if (isNotNullAndUndefined(competitionUniqueKey)) {
            const getCompetitions = await this.competitionService.getCompetitionByUniquekey(competitionUniqueKey);
            competitionIds = getCompetitions.id;
        }

        // if (teamIds && !Array.isArray(teamIds)) teamIds = [teamIds];
        // if (divisionIds && !Array.isArray(divisionIds)) divisionIds = [divisionIds];
        // if (competitionIds && !Array.isArray(competitionIds)) competitionIds = [competitionIds];
        return this.teamService.loadLadder(name, teamIds, divisionIds, competitionIds);
    }

    @Authorized()
    @Post('/ladder/web')
    async loadTeamLadder(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody,
        @Res() response: Response
    ) {
        try {
            let competitionIds = null;
            let competitionId = null;
            if (isNotNullAndUndefined(requestBody.competitionUniqueKey)) {
                const getCompetitions = await this.competitionService.getCompetitionByUniquekey(requestBody.competitionUniqueKey);
                competitionIds = getCompetitions.id;
            }
            if (isNotNullAndUndefined(requestBody.competitionId)) {
                const getCompetition = await this.competitionService.getCompetitionByUniquekey(requestBody.competitionId);
                competitionId = getCompetition.id;
            }

            return await this.teamService.getLadderList(requestBody, competitionId, competitionIds);
        } catch (error) {
            logger.error(`Error Occurred in  loadTeamLadder   ${currentUser.id}` + error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
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
        if (isArrayPopulated(playerIds)) {
            logger.info('Fetching playerData via playerIds');
            let playersData = await this.teamService.getPlayerDataByPlayerIds(playerIds);
            for (let i of playersData) {
                this.invitePlayer(user, i, isInviteToParents);
            }
            return playersData;
        } else if (isArrayPopulated(teamIds)) {
            logger.info('Fetching playerData via teamIds');
            let playerList = await this.teamService.playerListByTeamId(teamIds);
            for (let i of playerList) {
                this.invitePlayer(user, i, isInviteToParents);
            }
            return playerList;
        }

        return [];
    }

    public async invitePlayer(user: User, player: Player, isInviteToParents: boolean) {
        // if a user is < 18 and we are unsure whether the email belongs to the child or parent,
        // we store the email with _ prepended to the front so that the parent can legitimately
        // create a user record, using their details (which we don't have), otherwise we have
        // already got a record created for them, so they shouldn't need to create one
        //
        // 1) Invite Parent
        // a) their child user will have a 'child{x}+(parentemail)' email address if we already know the parent's details, and we have created a parent user account
        // b) their child user will have a '_(unknownemail)' email address, and the parent will need to create their own account
        // 2) Invite Player
        // a) player.user.email will not start with '_(parentemail)' email address, and we can link record we have already created
        // b) player.user.email will be '_(unknownemail)' email address, and player.email matches unknownemail: update user.email
        // c) player.user.email will be '_(unknownemail)' email address, but player.email doesn't match unknownemail i.e. the "child" has provided another email address: update user.email
        //
        // Scenarios not handled yet:
        // Differentiating from a user who already knows their login vs one we have set up (could look at last log in date)

        // existingUser = false -> send generic email which tell user to use existing login or create a new one; existingUser = true means we have to send them a specific password
        let existingUser = false;
        if (player.userId) {
            let playerUser = await this.userService.findUserFullDetailsById(player.userId);
            let emailUser = await this.userService.findByEmail(player.email);
            if (isInviteToParents && emailUser) {
                existingUser = true;
            } else if (!isInviteToParents && playerUser) {
                if (playerUser.email != player.email && playerUser.firstName == player.firstName && playerUser.lastName == player.lastName) {
                    if (!emailUser) {
                        playerUser.email = player.email;
                        await this.userService.createOrUpdate(playerUser);
                        await this.updateFirebaseData(playerUser, playerUser.password);
                        existingUser = true;
                    }
                } else if (playerUser.email == player.email) {
                    existingUser = true;
                }
            }
        }

        this.teamService.sendInviteMail(user, player, isInviteToParents, existingUser);
        player.inviteStatus = "INVITED";
        this.notifyInvite(player.email);
        await this.playerService.createOrUpdate(player);
    }

    private async notifyInvite(email: string) {
        let invitedUser = await this.userService.findByEmail(email);
        if (invitedUser) {
            let tokens = (await this.deviceService.getUserDevices(invitedUser.id)).map(device => device.deviceId);
            if (tokens && tokens.length > 0) {
                this.firebaseService.sendMessageChunked({
                    tokens: tokens,
                    data: {
                        type: 'player_invite_update'
                    }
                });
            }
        }
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
            return response.status(422).send({
                name: 'validation_error',
                message: 'Not all required fields filled'
            });
        }

        if (!teamData.id) {
            const existing = await this.teamService.findByNameAndCompetition(teamData.name, teamData.competitionId);
            if (existing.length > 0) {
                logger.info(`Team ${teamData.name} already exists.`);
                return response.status(400).send({
                    name: 'validation_error',
                    message: 'A team with this name already exists.'
                });
            }
        }

        let team = new Team();
        var existingManagerUREs: UserRoleEntity[] = [];
        if (teamData.id) {
            team.id = stringTONumber(teamData.id);
            existingManagerUREs = await this.ureService.findTeamUREByParams(team.id, Role.MANAGER);
            await this.ureService.deleteRoleByParams(team.id, EntityType.TEAM, Role.MANAGER);
        }
        team.name = teamData.name;
        team.alias = teamData.alias;
        team.competitionId = stringTONumber(teamData.competitionId);
        team.divisionId = stringTONumber(teamData.divisionId);
        if (teamData.competitionOrganisationId) {
            team.competitionOrganisationId = stringTONumber(teamData.competitionOrganisationId);
        }
        team.logoUrl = teamData.logoUrl;
        let savedTeam = await this.teamService.createOrUpdate(team);
        this.checkTeamFirestoreDatabase(team);

        let managerIds: number[] = teamData.userIds ? JSON.parse(teamData.userIds) : [];
        let savedUser: User;
        let password: string;
        if (teamData.email && teamData.firstName && teamData.lastName && teamData.mobileNumber) {
            let foundUser = await this.userService.findByEmail(teamData.email.toLowerCase());
            if (foundUser) {
                if (foundUser.firstName == teamData.firstName && foundUser.lastName == teamData.lastName && foundUser.mobileNumber == teamData.mobileNumber) {
                    managerIds[0] = foundUser.id;
                } else {
                    return response.status(400).send({
                        name: 'validation_error',
                        message: 'A user with this email address already exists however other details do not match'
                    });
                }
            } else {
                let managerInfo = new User();
                managerInfo.firstName = teamData.firstName;
                managerInfo.lastName = teamData.lastName;
                managerInfo.email = teamData.email.toLowerCase();
                managerInfo.mobileNumber = teamData.mobileNumber;
                password = Math.random().toString(36).slice(-8);
                managerInfo.password = md5(password);

                savedUser = await this.userService.createOrUpdate(managerInfo);
                await this.updateFirebaseData(managerInfo, managerInfo.password);
                logger.info(`Manager ${managerInfo.email} signed up.`);
                managerIds[managerIds.length] = savedUser.id;
            }
        }

        for (let managerId of managerIds) {
            if (managerId != 0) {
                if (!savedUser) {
                    await this.userService.deleteRolesByUser(managerId, Role.MEMBER, savedTeam.competitionId, EntityType.COMPETITION, EntityType.COMPETITION);
                }

                let ureArray = [];

                let ure = new UserRoleEntity();
                ure.roleId = Role.MANAGER;
                ure.entityId = savedTeam.id;
                ure.entityTypeId = EntityType.TEAM;
                ure.userId = managerId
                ure.createdBy = user.id;
                ureArray.push(ure);

                let ure1 = new UserRoleEntity();
                ure1.roleId = Role.MEMBER;
                ure1.entityId = savedTeam.competitionId;
                ure1.entityTypeId = EntityType.COMPETITION;
                ure1.userId = managerId
                ure1.createdBy = user.id;
                ureArray.push(ure1);

                await this.ureService.batchCreateOrUpdate(ureArray);
                await this.notifyChangeRole(managerId);
            }
        }
        const chatRecipientFunction = await this.userService.getFunction('chat_recipient');
        const teamUsers = await this.userService.getUsersByOptions(
            EntityType.TEAM,
            [savedTeam.id],
            null,
            { functionId: chatRecipientFunction.id }
        );
        /// Remove all managers from chats if they are not manager any more
        existingManagerUREs.forEach(async ure => {
            let found = managerIds.find(userId => userId == ure.userId);
            let managerUser = await this.userService.findById(ure.userId);
            if (!found) {
                this.notifyChangeRole(ure.userId);
                /// Need to check if the user still has chat_recipient function
                const chatPermissionCount = await this.ureService.getUserTeamChatRoleCount(savedTeam.id, managerUser.id);
                if (chatPermissionCount == 0) {
                    this.firebaseService.removeUserFromTeamChat(savedTeam.id, managerUser);
                    this.firebaseService.removeUserForOneToOne(managerUser, teamUsers);
                    this.firebaseService.removeUserForGroupChat(managerUser);
                }
            }
        });
        /// For managers make sure they are in the chat
        managerIds.forEach(async managerId => {
            let managerUser = await this.userService.findById(managerId);
            this.addUserToTeamChat(savedTeam.id, managerUser);
        });

        if (savedUser) {
            let competitionData = await this.competitionService.findById(savedTeam.competitionId)

            this.userService.sentMail(user, [savedTeam], competitionData, Role.MANAGER, savedUser, password);
        }

        if (file && isPhoto(file.mimetype)) {
            if (isNotNullAndUndefined(teamData.logoUrl) && teamData.logoUrl.includes(`%2Fteam%2F${savedTeam.id}`)) {

                const fileName = await this.firebaseService.getFileNameFromUrl(JSON.stringify(teamData.logoUrl), 'team%F');
                await this.firebaseService.removeMedia(fileName);
            }

            let filename = `/team/${savedTeam.id}_S{savedTeam.name}.${fileExt(file.originalname)}`;;
            let result = await this.firebaseService.upload(filename, file);
            if (result) {
                savedTeam.logoUrl = result['url'];
                savedTeam = await this.teamService.createOrUpdate(savedTeam);
            } else {
                return response
                    .status(400).send(
                        { name: 'save_error', message: 'Logo not saved, try again later.' });
            }
        } else if (isNullOrEmpty(teamData.logoUrl) && savedTeam.competitionOrganisationId) {
            let linkedCompetitionOrganisation = await this.competitionOrganisationService
                .findLinkedCompetitionOrganisation(stringTONumber(savedTeam.competitionOrganisationId));
            if (isNotNullAndUndefined(linkedCompetitionOrganisation) &&
                isNotNullAndUndefined(linkedCompetitionOrganisation.logoUrl)) {
                  savedTeam.logoUrl = linkedCompetitionOrganisation.logoUrl;
                  savedTeam = await this.teamService.createOrUpdate(savedTeam);
            }
        }
        return savedTeam;
    }

    @Authorized()
    @Post('/import')
    async importTeam(
        @HeaderParam("authorization") user: User,
        @QueryParam('competitionId') competitionId: number,
        @UploadedFile("file", { required: true }) file: Express.Multer.File,
        @Res() response: Response
    ) {
        const requiredField = [
            'Team Name',
            'Division Grade',
            'Organisation'
        ];

        const bufferString = file.buffer.toString('utf8');
        const data = arrangeCSVToJson(bufferString);
        const competition = await this.competitionService.findById(competitionId);

        let queryArr = [];
        const { result: importArr, message } = validationForField({
            filedList: requiredField,
            values: data,
        });

        if (isNotNullAndUndefined(competition)) {
            for (let i of importArr) {
                let teamData = await this.teamService.findByNameAndCompetition(i["Team Name"], competitionId, null, i["Division Grade"]);
                if (!isArrayPopulated(teamData)) {
                    let divisionData = await this.divisionService.findByName(i["Division Grade"], competitionId);
                    let linkedCompetitionOrganisationData = await this.linkedCompetitionOrganisationService.findByNameAndCompetitionId(i.Organisation, competitionId);
                    if (!isArrayPopulated(divisionData) || !isArrayPopulated(linkedCompetitionOrganisationData)) {
                        if (message[`Line ${i.line}`]) {
                            if (!message[`Line ${i.line}`].message) {
                                message[`Line ${i.line}`].message = [];
                            }
                        } else {
                            message[`Line ${i.line}`] = {
                                ...i,
                                message: [],
                            };
                        }
                        if (!isArrayPopulated(divisionData)) {
                            message[`Line ${i.line}`].message.push(`Can't find a matching Division Grade "${i['Division Grade']}" related to current competition: ${competition.longName}.`);
                        }
                        if (!isArrayPopulated(linkedCompetitionOrganisationData)) {
                            message[`Line ${i.line}`].message.push(`Can't find a matching organisation "${i.Organisation}" related to current competition: ${competition.longName}.`);
                        }
                    } else {
                        let team = new Team();
                        team.name = i["Team Name"];
                        team.competitionId = competitionId;
                        team.divisionId = divisionData[0].id;
                        team.competitionOrganisationId = linkedCompetitionOrganisationData[0].id;
                        queryArr.push(team);
                    }
                } else {
                    if (message[`Line ${i.line}`]) {
                        if (!message[`Line ${i.line}`].message) {
                            message[`Line ${i.line}`].message = [];
                        }
                    } else {
                        message[`Line ${i.line}`] = {
                            ...i,
                            message: [],
                        };
                    }
                    message[`Line ${i.line}`].message.push(`The team "${i["Team Name"]}" is already registered.`);
                }
            }

            await this.teamService.batchCreateOrUpdate(queryArr);
            await Promise.all(queryArr.map((team: Team) => {
                return this.checkTeamFirestoreDatabase(team);
            }));
        } else {
            message[''].message.push('Could not find a matching competition.');
        }

        const totalCount = data.length;
        const successCount = queryArr.length;
        const failedCount = data.length - queryArr.length;
        const resMsg = `${totalCount} lines processed. ${successCount} lines successfully imported and ${failedCount} lines failed.`;

        return response.status(200).send({
            success: true,
            error: message,
            message: resMsg,
            data: queryArr,
            rawData: data,
        });
    }

    private async checkTeamFirestoreDatabase(team: Team) {
        let db = admin.firestore();
        let teamsCollectionRef = await db.collection('teams');
        let queryRef = teamsCollectionRef.where('id', '==', team.id);
        let querySnapshot = await queryRef.get();

        if (querySnapshot.empty) {
            teamsCollectionRef.doc(team.id.toString()).set({
                'logoUrl': isNotNullAndUndefined(team.logoUrl) ? team.logoUrl : null,
                'id': team.id,
                'name': team.name,
                'created_at': admin.firestore.FieldValue.serverTimestamp()
            });
        } else {
            teamsCollectionRef.doc(team.id.toString()).update({
                'logoUrl': isNotNullAndUndefined(team.logoUrl) ? team.logoUrl : null,
                'id': team.id,
                'name': team.name,
                'updated_at': admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }

    private async deleteTeamFirestoreDatabase(teamId: number) {
        let db = admin.firestore();

        /// Check for the team in the teams collection
        let teamsCollectionRef = await db.collection('teams');
        let queryRef = teamsCollectionRef.where('id', '==', teamId);
        let querySnapshot = await queryRef.get();

        if (!querySnapshot.empty) {
            teamsCollectionRef.doc(teamId.toString()).update({
                'deleted_at': admin.firestore.FieldValue.serverTimestamp()
            });
        }

        /// Check for the team chat for this particular team
        let teamChatCollectionRef = await db.collection('chats');
        // If any one changing the id it needs to be the same in the firestore
        // and app side as well. Very critical change be sure.
        const teamChatId: string = `team${teamId}chat`;
        let chatQueryRef = teamChatCollectionRef.where('id', '==', teamChatId);
        let chatQuerySnapshot = await chatQueryRef.get();

        if (!chatQuerySnapshot.empty) {
            teamChatCollectionRef.doc(teamChatId).update({
                'deleted_at': admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }

    @Authorized()
    @Get('/export')
    async exportTeams(
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('competitionOrganisationId') competitionOrganisationId: number,
        @QueryParam('divisionId') divisionId: number,
        @Res() response: Response
    ): Promise<any> {
        const getTeamsData = await this.listCompetitionTeams(
            competitionId,
            competitionOrganisationId,
            divisionId,
            null,
            null,
            null,
            null,
            null,
            null
        );
        if (isArrayPopulated(getTeamsData)) {
            getTeamsData.map(e => {
                e['Logo'] = e['logoUrl']
                e['Team Name'] = e['name']
                e['Team Alias Name'] = e['alias'];
                e['Affiliate'] = e['linkedCompetitionOrganisation']['name']
                e['Division'] = e['division']['name']
                e['#Players'] = e['playersCount']
                const managerName = [];
                const managerEmail = [];
                const managerContact = [];
                if (isArrayPopulated(e['managers'])) {
                    for (let r of e['managers']) {
                        managerName.push(r['name']);
                        managerEmail.push(r['email']);
                        managerContact.push(r['mobileNumber']);
                    }
                }
                e['Manager'] = managerName.toString().replace(",", '\n');
                e['Contact'] = managerEmail.toString().replace(",", '\n');
                e['Email'] = managerContact.toString().replace(",", '\n');

                delete e['alias'];
                delete e['division'];
                delete e['id'];
                delete e['logoUrl'];
                delete e['managers'];
                delete e['name'];
                delete e['playersCount'];
                delete e['linkedCompetitionOrganisation'];
                delete e['competitionOrganisationId'];
                delete e['coaches'];

                return e;
            });
        } else {
            getTeamsData.push({
                ['Logo']: 'N/A',
                ['Team Name']: 'N/A',
                ['Team Alias Name']: 'N/A',
                ['Affiliate']: 'N/A',
                ['Division']: 'N/A',
                ['#Players']: 'N/A',
                ['Manager']: 'N/A',
                ['Contact']: 'N/A',
                ['Email']: 'N/A'
            });
        }

        response.setHeader('Content-disposition', 'attachment; filename=teams.csv');
        response.setHeader('content-type', 'text/csv');
        fastcsv.write(getTeamsData, { headers: true })
            .on("finish", function () {
            })
            .pipe(response);
    }

    @Authorized()
    @Post('/ladder/adjustment')
    async saveTeamLadderAdjustments(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody,
        @Res() response: Response
    ) {
        try {
            const getCompetition = await this.competitionService.getCompetitionByUniquekey(requestBody.competitionUniqueKey);
            let competitionId = getCompetition.id;

            const existingTeamLadderAdjustments = await this.teamLadderService.findExistingTeamLadderAdj(competitionId, requestBody.divisionId);
            let teamLadderMap = new Map();
            if (isArrayPopulated(requestBody.adjustments)) {
                for (let adj of requestBody.adjustments) {
                    let teamLadder = new TeamLadder;
                    teamLadder.id = adj.teamLadderId;
                    teamLadder.teamId = adj.teamId;
                    teamLadder.divisionId = requestBody.divisionId;
                    teamLadder.competitionId = competitionId;
                    if (adj.teamLadderId == 0) {
                        teamLadder.teamLadderTypeRefId = 25;
                        teamLadder.createdBy = currentUser.id;
                    } else {
                        teamLadder.updatedBy = currentUser.id;
                        teamLadder.updated_at = new Date();
                    }
                    teamLadder.teamLadderTypeValue = adj.points;
                    teamLadder.adjustmentReason = adj.adjustmentReason;
                    let teamLadderRes = await this.teamLadderService.createOrUpdate(teamLadder);
                    teamLadderMap.set(teamLadderRes.id, teamLadderRes);
                }
            }
            if (isArrayPopulated(existingTeamLadderAdjustments)) {
                for (let tl of existingTeamLadderAdjustments) {
                    if (teamLadderMap.get(tl.id) == undefined) {
                        let teamLadderModel = new TeamLadder();
                        teamLadderModel.id = tl.id;
                        teamLadderModel.deleted_at = new Date();
                        teamLadderModel.updatedBy = currentUser.id;
                        teamLadderModel.updated_at = new Date();
                        await this.teamLadderService.createOrUpdate(teamLadderModel);
                    }
                }
            }

            return response.status(200).send('Updated Successfully.');

        } catch (error) {
            logger.error(`Error Occurred in  save ladder adjustments   ${currentUser.id}` + error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }

    @Authorized()
    @Get('/ladder/adjustment')
    async getTeamLadderAdjustments(
        @QueryParam('competitionUniqueKey') competitionUniqueKey: string,
        @QueryParam('divisionId') divisionId: number,
        @HeaderParam("authorization") currentUser: User,
        @Res() response: Response
    ) {
        try {
            const getCompetition = await this.competitionService.getCompetitionByUniquekey(competitionUniqueKey);
            let competitionId = getCompetition.id;

            const ladderAdjustments = await this.teamLadderService.getTeamLadderAdjustments(competitionId, divisionId);

            return response.status(200).send(ladderAdjustments);
        } catch (error) {
            logger.error(`Error Occurred in  get ladder adjustments   ${currentUser.id}` + error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }

    @Authorized()
    @Post('/ladder/reset')
    async ladderReset(
        @HeaderParam("authorization") currentUser: User,
        @Body() requestBody,
        @Res() response: Response
    ) {
        try {
            const getCompetition = await this.competitionService.getCompetitionByUniquekey(requestBody.competitionUniqueKey);
            let competitionId = getCompetition.id;
            let divisionId = requestBody.resetOptionId == 1 ? requestBody.divisionId : null;

            await this.teamLadderService.clearLadderPoints(competitionId, divisionId, currentUser.id);

            return response.status(200).send('Updated Successfully.');

        } catch (error) {
            logger.error(`Error Occurred in  save ladder Reset   ${currentUser.id}` + error);
            return response.status(500).send({
                message: 'Something went wrong. Please contact administrator'
            });
        }
    }
}
