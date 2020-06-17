import {Authorized, Post, HeaderParam, Body, Res, Get, JsonController, QueryParam, UploadedFile} from 'routing-controllers';
import {Player} from '../models/Player';
import {User} from '../models/User';
import {BaseController} from "./BaseController";
import {Response} from "express";
import * as  fastcsv from 'fast-csv';
import { isPhoto, fileExt, timestamp, stringTONumber, paginationData, isArrayPopulated } from '../utils/Utils';
import {RequestFilter} from "../models/RequestFilter";

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
        @QueryParam('limit') limit: number
    ): Promise<Player[]> {
        return this.playerService.findByParam(name, competitionId, organisationId, teamId, playUpFromAge, playUpFromGrade, offset, limit, null);
    }

    @Authorized()
    @Post('/')
    async create(
        @Body() playerInput: any,
        @UploadedFile("photo") file: Express.Multer.File,
        @Res() response: Response
    ) {
      if (playerInput) {
            // changed the type of player from "Player" to any as id should be integer for edit mode
            // and while using formdata content-type id is of type string
            let p = new Player();
            if (playerInput.id) {
                p.id = stringTONumber(playerInput.id);;
            }

            // Getting existing player for the id if we have a player already
            // for checking with email so we can update invite status.
            // Also ensure web doesn't overwrite details of the esisting player
            // web form is only sending back firstName, lastName, dateOfBirth, phoneNumber, mnbPlayerId, teamId, competitionId, photo
            let existingPlayer = await this.playerService.findById(p.id);
            if (existingPlayer) {
                p = existingPlayer;
            }

            p.firstName = playerInput.firstName;
            p.lastName = playerInput.lastName;
            p.phoneNumber = playerInput.phoneNumber;
            p.mnbPlayerId = playerInput.mnbPlayerId;
            p.teamId = playerInput.teamId;
            p.competitionId = playerInput.competitionId;

            if (playerInput.positionId || playerInput.shirt || playerInput.nameFilter ) {
                p.positionId = playerInput.positionId;
                p.shirt = playerInput.shirt;
                p.nameFilter = playerInput.nameFilter;
            }

            if (playerInput.email) {
                if (existingPlayer &&
                    existingPlayer.email &&
                    existingPlayer.email.toLowerCase() === playerInput.email.toLowerCase()) {
                        p .email = playerInput.email.toLowerCase();
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
                        return response
                            .status(400).send(
                                { name: 'save_error', message: 'Image not saved, try again later.' });
                    }
                } else {
                    return response
                        .status(400).send(
                            { name: 'validation_error', message: 'File mime type not supported' });
                }
            }
            let saved = await this.playerService.createOrUpdate(p);
            return this.playerService.findById(saved.id);
        } else {
            return response.status(400).send({ name: 'validation_error', message: 'Player required' });
        }
    }

    @Authorized()
    @Post('/update/position')
    async updatePosition(
        @QueryParam('playerId', {required: true}) playerId: number,
        @QueryParam('positionId', {required: true}) positionId: number,
        @Res() response: Response
    ) {
        let player = await this.playerService.findById(playerId);
        if (player) {
            player.positionId = positionId;
            return this.playerService.createOrUpdate(player);
        } else {
            return response.status(400).send(
                {name: 'search_error', message: `Player with id ${playerId} not found`});
        }
    }

    @Authorized()
    @Post('/update/shirt')
    async updateShirt(
        @QueryParam('playerId', {required: true}) playerId: number,
        @QueryParam('shirt', {required: true}) shirt: string,
        @Res() response: Response
    ) {
        let player = await this.playerService.findById(playerId);
        if (player) {
            player.shirt = shirt;
            return this.playerService.createOrUpdate(player);
        } else {
            return response.status(400).send(
                {name: 'search_error', message: `Player with id ${playerId} not found`});
        }
    }

    @Authorized()
    @Get('/csv')
    async exportCSV(
        @QueryParam('competitionId') competitionId: number,
        @Res() response: Response
    ) {
        let playerData = await this.playerService.findByParam(null, competitionId, null, null, null, null, null, null, null);
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
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @UploadedFile("file") file: Express.Multer.File,
    ) {

        var queryParameter = () => new Promise(resolve => {
            var buf = Buffer.from(file.buffer);
            let str = buf.toString();
            let arr = [];
            let playerArr = [];
            let outputArr = [];

            fastcsv
                .parseString(str, { headers: true })
                .on('error', error => console.error(error))
                .on('data', row => {
                    arr.push(row)
                })

                .on('end', async () => {
                    for (let i of arr) {
                        let teamId = await this.teamService.findByNameAndCompetition(i.team, competitionId)
                        if (teamId) {
                            //var parts =i.DOB.split('/');
                            //var dateOfBirth = new Date(parts[0], parts[1] - 1, parts[2]);

                            let playerObj = new Player();
                            playerObj.teamId = teamId[0].id;
                            playerObj.firstName = i['first name'];
                            playerObj.lastName = i['last name'];
                            playerObj.mnbPlayerId = i.mnbPlayerId;
                            playerObj.dateOfBirth = i.DOB;
                            playerObj.phoneNumber = i['contact no'];
                            playerObj.competitionId = competitionId;
                            playerArr.push(playerObj);

                        } else {
                            outputArr.push(`No matching team found for ${i['first name']} ${i['last name']}`)
                        }
                    }

                    let data = await this.playerService.batchCreateOrUpdate(playerArr)
                    outputArr = [...data, ...outputArr];
                    resolve(outputArr)

                });

        })

        let playerData = await queryParameter();
        return playerData;
    }

    @Post('/activity')
    async listTeamPlayerActivity(
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('status') status: string,
        @Body() requestFilter: RequestFilter
    ): Promise<any[]> {
        return this.playerService.listTeamPlayerActivity(competitionId, requestFilter, status);
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
        @QueryParam('search') search: string): Promise<{ page: {}, players: Player[] }> {
        const playerData = await this.playerService.findByParam(name, competitionId, organisationId, teamId, playUpFromAge, playUpFromGrade, offset, limit, search);
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

        let teamAttendanceData = await this.playerService.listTeamPlayerActivity(competitionId, { paging: { offset: null, limit: null }, search: '' }, status);
        if (isArrayPopulated(teamAttendanceData)) {
            teamAttendanceData.map(e => {
                e['Match Id'] = e.matchId;
                e['Start Time'] = e.startTime;
                e['Team'] = e.team1name + ':' + e.team2name
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
            .on("finish", function () { })
            .pipe(response);
    }
}
