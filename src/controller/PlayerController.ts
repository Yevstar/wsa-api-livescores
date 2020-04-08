import {Authorized, Post, HeaderParam, Body, Res, Get, JsonController, QueryParam, UploadedFile} from 'routing-controllers';
import {Player} from '../models/Player';
import {User} from '../models/User';
import {BaseController} from "./BaseController";
import {Response} from "express";
import * as  fastcsv from 'fast-csv';
import { isPhoto, fileExt, timestamp, stringTONumber } from '../utils/Utils';
import {RequestFilter} from "../models/RequestFilter";

@JsonController('/players')
export class PlayerController extends BaseController {

    @Get('/')
    async find(
        @QueryParam('name') name: string,
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('clubId') clubId: number,
        @QueryParam('teamId') teamId: number,
        @QueryParam('playUpFromAge') playUpFromAge: number,
        @QueryParam('playUpFromGrade') playUpFromGrade: string,
        @QueryParam('offset') offset: number,
        @QueryParam('limit') limit: number
    ): Promise<Player[]> {
        return this.playerService.findByParam(name, competitionId, clubId, teamId, playUpFromAge, playUpFromGrade, offset, limit);
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
            let existingPlayer = await this.playerService.findById(p.id);

            // web form is only sending back firstName, lastName, dateOfBirth, phoneNumber, mnbPlayerId, teamId, competitionId, photo
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
                if (existingPlayer && existingPlayer.email.toLowerCase() === playerInput.email.toLowerCase()) {
                    p.email = playerInput.email.toLowerCase();
                    p.inviteStatus = playerInput.inviteStatus;
                  } else {
                    p.email = playerInput.email.toLowerCase();
                    p.inviteStatus = null;
                  }
            }

            if (playerInput.dateOfBirth) {
                const dateParts = (playerInput.dateOfBirth).split("-");
                const dateObject = new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);
                p.dateOfBirth = new Date(dateObject);
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

    @Get('/csv')
    async exportCSV(
        @QueryParam('competitionId') competitionId: number,
        @Res() response: Response
    ) {
        let playerData = await this.playerService.findByParam(null, competitionId, null, null, null, null, null, null);
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
        @Body() requestFilter: RequestFilter
    ): Promise<any[]> {
        return this.playerService.listTeamPlayerActivity(competitionId, requestFilter);
    }
}
