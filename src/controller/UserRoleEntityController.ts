import {Authorized, Body, Delete, Get, HeaderParam, JsonController, Param, Post, QueryParam, Res} from 'routing-controllers';
import {UserRoleEntity} from "../models/security/UserRoleEntity";
import {BaseController} from "./BaseController";
import {Response} from "express";
import {User} from "../models/User";
import { md5 } from "../utils/Utils";

@JsonController('/ure')
export class UserRoleEntityController extends BaseController {

    @Authorized()
    @Post('/linkPlayer')
    async linkPlayer(
        @HeaderParam("authorization") user: User,
        @QueryParam("id", {required: true}) id: number,
        @Res() response: Response) {

        const promises = [];

        let player = await this.playerService.findById(id);
        let playerRole = await this.userService.getRole("player");
        let teamEntityType = await this.userService.getEntityType("TEAM");

        let ure = new UserRoleEntity();
        ure.entityTypeId = teamEntityType;
        ure.entityId = player.teamId;
        ure.roleId = playerRole;
        ure.userId = user.id;
        ure.createdBy = user.id;

        player.inviteStatus = "REGISTERED";
        player.userId = user.id;

        let playerURE = await this.ureService.createOrUpdate(ure);

        promises.push(
          this.playerService.createOrUpdate(player)
        );
        promises.push(
          this.addUserToTeamChat(player.teamId, user)
        );
        await Promise.all(promises);

        await this.notifyChangeRole(playerURE.userId);

        return response.status(200).send({success: true});
    }

    @Authorized()
    @Post('/linkChildPlayer')
    async linkChildPlayer (
        @HeaderParam("authorization") user: User,
        @QueryParam("id", {required: true}) id: number,
        @Res() response: Response) {

        const promises = [];

        let player = await this.playerService.findById(id);
        let parentRole = await this.userService.getRole("parent");
        let playerRole = await this.userService.getRole("player");
        let userEntityType = await this.userService.getEntityType("USER");
        let teamEntityType = await this.userService.getEntityType("TEAM");
        const childUserPassword = md5('password');

        var childUser;
        if (player.userId != null || player.userId != undefined) {
          childUser = await this.userService.findById(player.userId);
        }
        if (childUser == null || childUser == undefined) {
          /// Creating user for player if doesn't exist for the email in the db
          let email = `player${player.id}@wsa.com`;
          childUser = await this.userService.findByEmail(email.toLowerCase());
          if (childUser == null || childUser == undefined) {
              childUser = new User();
              childUser.email = email.toLowerCase();
              childUser.password = childUserPassword;
              childUser.firstName = player.firstName;
              childUser.lastName = player.lastName;
              childUser.dateOfBirth = player.dateOfBirth;
              childUser.statusRefId = 0;

              childUser = await this.userService.createOrUpdate(childUser);
              await this.updateFirebaseData(childUser, childUserPassword);
          } else {
              childUser.statusRefId = 0;
              promises.push(
                this.userService.createOrUpdate(childUser)
              );
          }
          player.userId = childUser.id;
        } else {
          childUser.statusRefId = 0;
          childUser.password = childUserPassword;
          childUser = await this.userService.createOrUpdate(childUser);
          await this.updateFirebaseData(childUser, childUserPassword);
          // promises.push(
          //   this.userService.createOrUpdate(childUser)
          // );
          // promises.push(
          //   this.updateFirebaseData(childUser, childUserPassword)
          // );
        }

        let ure = new UserRoleEntity();
        ure.entityTypeId = userEntityType;
        ure.entityId = childUser.id;
        ure.roleId = parentRole;
        ure.userId = user.id;
        ure.createdBy = user.id;

        let parentURE = await this.ureService.createOrUpdate(ure);

        let newUserURE = new UserRoleEntity();
        newUserURE.entityTypeId = teamEntityType;
        newUserURE.entityId = player.teamId;
        newUserURE.roleId = playerRole; // Player
        newUserURE.userId = childUser.id;
        newUserURE.createdBy = user.id;

        promises.push(
          this.ureService.createOrUpdate(newUserURE)
        );
        promises.push(
          this.addUserToTeamChat(player.teamId, childUser)
        );

        player.inviteStatus = "REGISTERED";

        promises.push(
          this.playerService.createOrUpdate(player)
        );

        await Promise.all(promises);
        await this.notifyChangeRole(parentURE.userId);

        return response.status(200).send({success: true});
    }
}
