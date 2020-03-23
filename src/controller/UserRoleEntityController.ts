import {Authorized, Body, Delete, Get, HeaderParam, JsonController, Param, Post, QueryParam, Res} from 'routing-controllers';
import {UserRoleEntity} from "../models/security/UserRoleEntity";
import {BaseController} from "./BaseController";
import {Response} from "express";
import {User} from "../models/User";
import { md5 } from "../utils/Utils";
import {EntityType} from "../models/security/EntityType";
import {Role} from "../models/security/Role";

@JsonController('/ure')
export class UserRoleEntityController extends BaseController {

    @Authorized()
    @Post('/linkPlayer')
    async linkPlayer(
        @HeaderParam("authorization") user: User,
        @QueryParam("id", {required: true}) id: number,
        @Res() response: Response) {

        let player = await this.playerService.findById(id);
        let playerRole = await this.userService.getRole("player");
        let playerEntityType = await this.userService.getEntityType("PLAYER");

        let ure = new UserRoleEntity();
        ure.entityTypeId = playerEntityType;
        ure.entityId = id;
        ure.roleId = playerRole;
        ure.userId = user.id;
        let savedUre = await this.ureService.createOrUpdate(ure);
        player.inviteStatus = "REGISTERED";
        this.playerService.createOrUpdate(player);
        await this.notifyChangeRole(ure);
        return this.ureService.findById(savedUre.id);
    }

    @Authorized()
    @Post('/linkChildUser')
    async linkChildUser (
        @HeaderParam("authorization") user: User,
        @QueryParam("id", {required: true}) id: number,
        @Res() response: Response) {

        let player = await this.playerService.findById(id);
        let parentRole = await this.userService.getRole("parent");
        let userEntityType = await this.userService.getEntityType("USER");

        let ure = new UserRoleEntity();
        ure.entityTypeId = userEntityType;
        ure.entityId = id;
        ure.roleId = parentRole;
        ure.userId = user.id;
        let savedUre = await this.ureService.createOrUpdate(ure);
        player.inviteStatus = "REGISTERED";
        this.playerService.createOrUpdate(player);

        /// Creating user for player if doesn't exist for the email in the db
        let email = `player${player.id}@wsa.com`;
        const existing = await this.userService.findByEmail(email);
        if (!existing) {
          const newUserPassword = md5('password');
          let newUser = new User();
          newUser.email = email;
          newUser.password = newUserPassword;
          newUser.firstName = player.firstName;
          newUser.lastName = player.lastName;
          newUser.dateOfBirth = player.dateOfBirth;
          let savedUser = await this.userService.createOrUpdate(newUser);

          await this.updateFirebaseData(newUser, newUserPassword);

          let newUserURE = new UserRoleEntity();
          newUserURE.entityTypeId = EntityType.TEAM;
          newUserURE.entityId = player.teamId;
          newUserURE.roleId = Role.PLAYER; // Player
          newUserURE.userId = savedUser.id;
          newUserURE.createdBy = user.id;
          this.ureService.createOrUpdate(newUserURE);
        }

        await this.notifyChangeRole(ure);

        return this.ureService.findById(savedUre.id);
    }


    private async notifyChangeRole(ure) {
        let tokens = (await this.deviceService.getUserDevices(ure.userId)).map(device => device.deviceId);
        if (tokens && tokens.length > 0) {
            this.firebaseService.sendMessage({
                tokens: tokens,
                data: {
                    type: 'user_role_updated'
                }
            })
        }
    }

    @Post("/broadcast")
    async broadcastUre(
        @QueryParam("userId", {required: true}) userId: number,
        @Res() response: Response
    ) {
        let tokens = (await this.deviceService.getUserDevices(userId)).map(device => device.deviceId);
        if (tokens && tokens.length > 0) {
            this.firebaseService.sendMessage({
                tokens: tokens,
                data: {
                    type: 'user_role_updated'
                }
            })
        }
        return response.status(200).send({success: true});
    }
}
