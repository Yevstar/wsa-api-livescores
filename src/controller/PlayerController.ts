import { Response } from 'express';
import {
    Authorized,
    Post,
    HeaderParam,
    Body,
    Res,
    Get,
    Delete,
    Param,
    JsonController,
    QueryParam,
    UploadedFile
} from 'routing-controllers';
import * as fastcsv from 'fast-csv';

import {
    isPhoto,
    fileExt,
    timestamp,
    stringTONumber,
    paginationData,
    isArrayPopulated,
    isNotNullAndUndefined,
    md5,
    parseDateString,
    formatPhoneNumber,
    validationForField,
    trim,
    arrangeCSVToJson,
} from '../utils/Utils';
import { BaseController } from './BaseController';
import { Player } from '../models/Player';
import { User } from '../models/User';
import { Competition } from '../models/Competition';
import { LinkedCompetitionOrganisation } from '../models/LinkedCompetitionOrganisation';
import { Role } from '../models/security/Role';
import { EntityType } from '../models/security/EntityType';
import { UserRoleEntity } from '../models/security/UserRoleEntity';
import { RequestFilter } from '../models/RequestFilter';

@JsonController('/players')
export class PlayerController extends BaseController {

    @Get('/')
    async find(
        @QueryParam('name') name: string,
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('organisationId') organisationId: number,
        @QueryParam('teamId') teamId: number,
        @QueryParam('playUpFromAge') playUpFromAge: number,
        @QueryParam('playUpFromGrade') playUpFromGrade: string,
        @QueryParam('offset') offset: number,
        @QueryParam('limit') limit: number,
        @QueryParam('includeLinkedCompetition') includeLinkedCompetition: boolean = false
    ): Promise<Player[]> {
        let competition: Competition;
        let competitionOrganisation: LinkedCompetitionOrganisation
        if (competitionId) {
            competition = await this.competitionService.findById(competitionId);
        }
        if (organisationId) {
            competitionOrganisation = await this.organisationService.findById(organisationId);
        }

        return this.playerService.findByParam(
            name,
            competition,
            competitionOrganisation,
            teamId,
            playUpFromAge,
            playUpFromGrade,
            offset,
            limit,
            null,
            includeLinkedCompetition
        );
    }

    @Authorized()
    @Post('/')
    async create(
        @HeaderParam("authorization") user: User,
        @Body() playerInput: any,
        @UploadedFile("photo") file: Express.Multer.File,
        @Res() response: Response
    ) {
        if (playerInput) {
            let existingPlayer;
            // changed the type of player from "Player" to any as id should be integer for edit mode
            // and while using formdata content-type id is of type string
            let p = new Player();
            if (playerInput.id && playerInput.id != 0) {
                p.id = stringTONumber(playerInput.id);
                existingPlayer = await this.playerService.findById(p.id);
            }

            // Getting existing player for the id if we have a player already
            // for checking with email so we can update invite status.
            // Also ensure web doesn't overwrite details of the existing player
            // web form is only sending back firstName, lastName, dateOfBirth, phoneNumber, mnbPlayerId, teamId, competitionId, photo
            if (existingPlayer) {
                p = existingPlayer;
            }

            p.firstName = playerInput.firstName;
            p.lastName = playerInput.lastName;
            p.phoneNumber = playerInput.phoneNumber;
            p.mnbPlayerId = playerInput.mnbPlayerId;
            p.teamId = playerInput.teamId;
            p.competitionId = playerInput.competitionId;

            if (playerInput.positionId || playerInput.shirt || playerInput.nameFilter) {
                p.positionId = playerInput.positionId;
                p.shirt = playerInput.shirt;
                p.nameFilter = playerInput.nameFilter;
            }
            if (playerInput.email) {
                if (existingPlayer &&
                    existingPlayer.email &&
                    existingPlayer.email.toLowerCase() === playerInput.email.toLowerCase()) {
                    p.email = playerInput.email.toLowerCase();
                    p.inviteStatus = playerInput.inviteStatus;
                } else {
                    p.email = playerInput.email.toLowerCase();
                    p.inviteStatus = null;
                }
            }

            if (playerInput.dateOfBirth) {
                if (playerInput.dateOfBirth.length == 10) {
                    const dateParts = (playerInput.dateOfBirth).split("-");
                    const dateObject = new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);
                    p.dateOfBirth = new Date(dateObject);
                } else {
                    p.dateOfBirth = new Date(Date.parse(playerInput.dateOfBirth));
                }
            }
            if (file) {
                if (isPhoto(file.mimetype)) {
                    let filename = `/media/${playerInput.competitionId}/${playerInput.teamId}/${playerInput.id}_${timestamp()}.${fileExt(file.originalname)}`;
                    let result = await this.firebaseService.upload(filename, file);
                    if (result) {
                        p.photoUrl = result['url'];
                    } else {
                        return response.status(400).send({
                            name: 'save_error',
                            message: 'Image not saved, try again later.'
                        });
                    }
                } else {
                    return response.status(400).send({
                        name: 'validation_error',
                        message: 'File mime type not supported'
                    });
                }
            }
            let saved = await this.playerService.createOrUpdate(p);
            if (saved.userId == null) {
                //return await this.loadPlayerUser(saved);
                let playerUser = await this.loadPlayerUser(user, saved);
                if (playerUser) {
                    saved.userId = playerUser.id;
                    saved = await this.playerService.createOrUpdate(saved);
                }
            }
            return this.playerService.findById(saved.id);
        } else {
            return response.status(400).send({ name: 'validation_error', message: 'Player required' });
        }
    }

    @Authorized()
    @Post('/update/position')
    async updatePosition(
        @QueryParam('playerId', { required: true }) playerId: number,
        @QueryParam('positionId', { required: true }) positionId: number,
        @Res() response: Response
    ) {
        let player = await this.playerService.findById(playerId);
        if (player) {
            player.positionId = positionId;
            return this.playerService.createOrUpdate(player);
        } else {
            return response.status(400).send({
                name: 'search_error',
                message: `Player with id ${playerId} not found`
            });
        }
    }

    @Authorized()
    @Post('/update/shirt')
    async updateShirt(
        @QueryParam('playerId', { required: true }) playerId: number,
        @QueryParam('shirt', { required: true }) shirt: string,
        @Res() response: Response
    ) {
        let player = await this.playerService.findById(playerId);
        if (player) {
            player.shirt = shirt;
            return this.playerService.createOrUpdate(player);
        } else {
            return response.status(400).send({
                name: 'search_error',
                message: `Player with id ${playerId} not found`
            });
        }
    }

    @Authorized()
    @Get('/csv')
    async exportCSV(
        @QueryParam('competitionId') competitionId: number,
        @Res() response: Response
    ) {
        let competition: Competition;
        if (competitionId) {
            competition = await this.competitionService.findById(competitionId);
        }

        let playerData = await this.playerService.findByParam(
            null,
            competition,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            false
        );
        response.setHeader('Content-disposition', 'attachment; filename=player.csv');
        response.setHeader('content-type', 'text/csv');
        fastcsv
            .write(playerData, { headers: true })
            .on("finish", function () {
            })
            .pipe(response);
    }

    @Authorized()
    @Post('/import')
    async importCSV(
        @HeaderParam("authorization") user: User,
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @UploadedFile("file") file: Express.Multer.File,
        @Res() response: Response,
    ) {
        const requiredField = [
            'First Name',
            'Last Name',
            'DOB',
            'Team',
        ];

        const bufferString = file.buffer.toString('utf8');
        const data = arrangeCSVToJson(bufferString);

        const { result: importArr, message } = validationForField({
            filedList: requiredField,
            values: data,
        });

        let queryArr = [];
        for (let i of importArr) {
            const team = i.Team;
            const teams = await this.teamService.findByNameAndCompetition(team, competitionId, i['Division Grade']);
            if (isArrayPopulated(teams)) {
                const playerObj = new Player();
                playerObj.teamId = teams[0].id;
                playerObj.firstName = i['First Name'];
                playerObj.lastName = i['Last Name'];
                playerObj.mnbPlayerId = i.mnbPlayerId;
                playerObj.dateOfBirth = i.DOB ? parseDateString(i.DOB) : undefined;
                playerObj.phoneNumber = formatPhoneNumber(i['Contact No']);
                playerObj.competitionId = competitionId;
                queryArr.push(playerObj);
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

                message[`Line ${i.line}`].message.push(`No matching team found for ${i['Team']}.`);
            }
        }

        let result = await this.playerService.batchCreateOrUpdate(queryArr as Player[]);
        for (let p of result) {
            const playerUser = await this.loadPlayerUser(user, p);
            p.userId = playerUser ? playerUser.id : -1;
            await this.playerService.createOrUpdate(p);
        }

        const totalCount = data.length;
        const successCount = queryArr.length;
        const failedCount = data.length - queryArr.length;
        const resMsg = `${totalCount} lines processed. ${successCount} lines successfully imported and ${failedCount} lines failed.`;

        return response.status(200).send({
            success: true,
            message: resMsg,
            error: message,
            data: queryArr,
            rawData: data,
        });
    }

    @Post('/activity')
    async listTeamPlayerActivity(
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('divisionId') divisionId: string = undefined,
        @QueryParam('roundIds') roundIds: string = undefined,
        @QueryParam('status') status: string,
        @QueryParam('sortBy') sortBy: string = undefined,
        @QueryParam('sortOrder') sortOrder: "ASC"|"DESC" = undefined,
        @Body() requestFilter: RequestFilter
    ): Promise<any[]> {
        if (status === undefined || status === '') status = null;
        if (requestFilter.search === undefined || requestFilter.search === '') requestFilter.search = null;

        return this.playerService.listTeamPlayerActivity(competitionId, requestFilter, divisionId, roundIds, status, sortBy, sortOrder);
    }

    @Get('/admin')
    async findPlayers(
        @QueryParam('name') name: string,
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('organisationId') organisationId: number,
        @QueryParam('teamId') teamId: number,
        @QueryParam('playUpFromAge') playUpFromAge: number,
        @QueryParam('playUpFromGrade') playUpFromGrade: string,
        @QueryParam('offset') offset: number,
        @QueryParam('limit') limit: number,
        @QueryParam('search') search: string,
        @QueryParam('sortBy') sortBy?: string,
        @QueryParam('sortOrder') sortOrder?: "ASC" | "DESC"
    ): Promise<{ page: {}, players: Player[] }> {
        let competition: Competition;
        let competitionOrganisation: LinkedCompetitionOrganisation
        if (competitionId) {
            competition = await this.competitionService.findById(competitionId);
        }
        if (organisationId) {
            competitionOrganisation = await this.organisationService.findById(organisationId);
        }

        const playerData = await this.playerService.findByParam(
            name,
            competition,
            competitionOrganisation,
            teamId,
            playUpFromAge,
            playUpFromGrade,
            offset,
            limit,
            search,
            false,
            sortBy,
            sortOrder
        );
        if (offset !== null && offset !== undefined && limit !== null && limit !== undefined) {
            return { page: paginationData(playerData.matchCount, limit, offset).page, players: playerData.result };
        } else {
            return { page: {}, players: playerData };
        }
    }

    @Authorized()
    @Get('/export/teamattendance')
    async exportTeamAttendance(
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('status') status: string,
        @Res() response: Response) {

        let teamAttendanceData = await this.playerService.listTeamPlayerActivity(competitionId, {
            paging: {
                offset: null,
                limit: null
            },
            search: ''
        }, status, null, null);
        if (isArrayPopulated(teamAttendanceData)) {
            teamAttendanceData.map(e => {
                e['Match Id'] = e.matchId;
                e['Start Time'] = e.startTime;
                e['Team'] = e.name
                e['Player Id'] = e.playerId
                e['First Name'] = e.firstName
                e['Last Name'] = e.lastName;
                e['Division'] = e.divisionName
                e['Status'] = e.status
                e['Position'] = e.positionName;

                delete e.activityTimestamp;
                delete e.competitionId;
                delete e.divisionName;
                delete e.firstName;
                delete e.lastName;
                delete e.matchId;
                delete e.mnbMatchId;
                delete e.mnbPlayerId;
                delete e.name;
                delete e.period;
                delete e.playerId;
                delete e.positionName;
                delete e.startTime;
                delete e.status;
                delete e.team1id;
                delete e.team1name;
                delete e.team2id;
                delete e.team2name;
                delete e.teamId;
                delete e.userId;
                return e;
            });
        } else {
            teamAttendanceData.push({
                ['Match Id']: 'N/A',
                ['Start Time']: 'N/A',
                ['Team']: 'N/A',
                ['Player Id']: 'N/A',
                ['First Name']: 'N/A',
                ['Last Name']: 'N/A',
                ['Division']: 'N/A',
                ['Status']: 'N/A',
                ['Position']: 'N/A'
            });
        }

        response.setHeader('Content-disposition', 'attachment; filename=teamattendance.csv');
        response.setHeader('content-type', 'text/csv');
        fastcsv.write(teamAttendanceData, { headers: true })
            .on("finish", function () {
            })
            .pipe(response);
    }

    private async loadPlayerUser(
        creator: User,
        player: Player
    ): Promise<any> {
        if (
            isNotNullAndUndefined(player.firstName) &&
            isNotNullAndUndefined(player.lastName) &&
            isNotNullAndUndefined(player.phoneNumber)
        ) {
            const userDetails = new User();
            let newUser = false;
            let teamDetailArray: any = [];
            let orgDetailArray: any = [];
            let savedUserDetail: User;

            const userResults = await this.userService.findByParam(player.firstName, player.lastName, player.phoneNumber, player.dateOfBirth);
            if (userResults && userResults[0]) {
                let foundUser = userResults[0];
                newUser = false;
                if (foundUser.firstName == player.firstName
                    && foundUser.lastName == player.lastName
                    && foundUser.mobileNumber == player.phoneNumber) {
                    savedUserDetail = foundUser;

                    await this.userService.deleteRolesByUser(foundUser.id, Role.PLAYER, player.competitionId, EntityType.COMPETITION, EntityType.TEAM);
                    await this.userService.deleteRolesByUser(foundUser.id, Role.MEMBER, player.competitionId, EntityType.COMPETITION, EntityType.COMPETITION);

                } else {
                    // TODO: found user with same email but different details
                    // They could be the child or need to be merged e.g. number is out of date
                }
            } else {
                newUser = true;
                userDetails.email = 'player' + player.id + '@wsa.com';
                userDetails.password = md5('password');
                userDetails.firstName = player.firstName;
                userDetails.lastName = player.lastName;
                userDetails.mobileNumber = player.phoneNumber;
                userDetails.statusRefId = 1;
                userDetails.dateOfBirth = player.dateOfBirth;
                savedUserDetail = await this.userService.createOrUpdate(userDetails);
                await this.updateFirebaseData(userDetails, userDetails.password);
            }

            let ureArray = [];
            let ure = new UserRoleEntity();
            ure.roleId = Role.PLAYER;
            ure.entityId = player.teamId;
            ure.entityTypeId = EntityType.TEAM;
            ure.userId = savedUserDetail.id;
            ure.createdBy = creator.id;
            ureArray.push(ure);

            let ure1 = new UserRoleEntity();
            ure1.roleId = Role.MEMBER;
            ure1.entityId = player.competitionId;
            ure1.entityTypeId = EntityType.COMPETITION;
            ure.userId = savedUserDetail.id;
            ure.createdBy = creator.id;
            ureArray.push(ure1);
            await this.ureService.batchCreateOrUpdate(ureArray);

            return savedUserDetail;
        }
    }

    @Get('/borrowed')
    async findBorrowedPlayers(
        @QueryParam('matchId', { required: true }) matchId: number,
        @QueryParam('teamId', { required: true }) teamId: number,
        @QueryParam('lineupSelectionEnabled', { required: true }) lineupSelectionEnabled: boolean,
        @QueryParam('competitionId') competitionId: number,
        @Res() response: Response
    ) {
        if (!matchId || !teamId || (lineupSelectionEnabled == null)) {
            return response.status(400).send({
                name: 'service_error',
                message: 'Please provide all required parameter data'
            });
        } else if (lineupSelectionEnabled && !competitionId) {
            return response.status(400).send({
                name: 'service_error',
                message: 'Provide competitionId when lineup selection is enabled'
            });
        }

        let playerIds: number[] = new Array();
        if (lineupSelectionEnabled) {
            let lineupList = await this.lineupService.findByParams(
                matchId,
                competitionId,
                teamId,
                true
            );
            lineupList.forEach(lineup => {
                if (lineup.playerId) {
                    playerIds.push(lineup.playerId);
                }
            });
        } else {
            let gtaList = await this.gameTimeAttendanceService.findByParams(
                matchId,
                teamId,
                true
            );
            gtaList.forEach(gta => {
                if (gta.playerId) {
                    playerIds.push(gta.playerId);
                }
            });
        }

        if (isArrayPopulated(playerIds)) {
            return this.playerService.getBorrowedPlayersById(playerIds);
        } else {
            return [];
        }
    }

    @Authorized()
    @Get('/pendingInvites')
    async pendingInvites(
        @HeaderParam("authorization") user: User
    ) {
        let playerList = await this.playerService.findPendingInvites(user.email);
        if (isArrayPopulated(playerList)) {
            return playerList;
        } else {
            return [];
        }
    }


    @Authorized()
    @Delete('/id/:id')
    async delete(
        @Param("id") id: number,
        @HeaderParam("authorization") user: User) {
        return this.playerService.softDeleteBy(id);
    }
}
