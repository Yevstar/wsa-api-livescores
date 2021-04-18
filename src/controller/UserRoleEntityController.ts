import {
  Authorized,
  Body,
  Delete,
  Get,
  HeaderParam,
  JsonController,
  Param,
  Post,
  QueryParam,
  Res,
} from 'routing-controllers';
import { UserRoleEntity } from '../models/security/UserRoleEntity';
import { BaseController } from './BaseController';
import { Response } from 'express';
import { User } from '../models/User';
import { Player } from '../models/Player';
import { md5, isArrayPopulated } from '../utils/Utils';
import { Role } from '../models/security/Role';
import { EntityType } from '../models/security/EntityType';

@JsonController('/ure')
export class UserRoleEntityController extends BaseController {
  @Authorized()
  @Post('/linkPlayer')
  async linkPlayer(
    @QueryParam('playerId', { required: true }) playerId: number,
    @QueryParam('userId', { required: true }) userId: number,
    @Res() response: Response,
  ) {
    const promises = [];

    let player = await this.playerService.findById(playerId);
    let user = await this.userService.findById(userId);

    if (player && user && player.userId && user.id && player.userId != user.id) {
      /// Removing an exisitng user and also merging the URE's which
      /// doesn't match and marking delete for matched URE's
      await this.mergeURE(player.userId, user.id);

      let playerLinkedUser = await this.userService.findById(player.userId);
      playerLinkedUser.isDeleted = 1;
      this.userService.createOrUpdate(playerLinkedUser);

      /// Updating chats
      if (playerLinkedUser.firebaseUID && user.firebaseUID) {
        await this.firebaseService.updateFirebaseUIDOfExistingChats(
          playerLinkedUser.firebaseUID,
          user.firebaseUID,
        );
      }
      /// Updating all player linked user ids to new user id linking
      await this.playerService.updatePlayerUserDetails(playerLinkedUser, user);
    }

    let ure = new UserRoleEntity();
    ure.entityTypeId = EntityType.TEAM;
    ure.entityId = player.teamId;
    ure.roleId = Role.PLAYER;
    ure.userId = user.id;
    ure.createdBy = user.id;

    player.inviteStatus = 'REGISTERED';
    player.userId = user.id;

    let playerURE = await this.ureService.createOrUpdate(ure);

    promises.push(this.playerService.createOrUpdate(player));
    promises.push(this.addUserToTeamChat(player.teamId, user));
    await Promise.all(promises);

    await this.notifyChangeRole(playerURE.userId);
    await this.evaluateWatchlist(user.id, player.teamId);

    return response.status(200).send({ success: true });
  }

  @Authorized()
  @Post('/linkChildPlayer')
  async linkChildPlayer(
    @QueryParam('playerId', { required: true }) playerId: number,
    @QueryParam('userId', { required: true }) userId: number,
    @QueryParam('justLinkToTeam') justLinkToTeam: boolean,
    @Res() response: Response,
  ) {
    if (justLinkToTeam == null || justLinkToTeam == undefined) {
      justLinkToTeam = false;
    }

    let player = await this.playerService.findById(playerId);
    let parentUser = await this.userService.findById(userId);
    const childUserPassword = md5('password');

    var childUser;
    if (player.userId != null || player.userId != undefined) {
      childUser = await this.userService.findById(player.userId);
    }
    if (childUser == null || childUser == undefined) {
      /// Creating user for player if doesn't exist for the email in the db
      let email = `${parentUser.email}.${player.firstName}`;
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
        childUser = await this.userService.createOrUpdate(childUser);
      }
      player.userId = childUser.id;
    } else if (!justLinkToTeam) {
      childUser.statusRefId = 0;
      childUser.password = childUserPassword;
      childUser = await this.userService.createOrUpdate(childUser);
      await this.updateFirebaseData(childUser, childUserPassword);
    }

    await this.linkChild(parentUser, childUser, player, justLinkToTeam);

    return response.status(200).send({ success: true });
  }

  private async linkChild(
    parentUser: User,
    childUser: User,
    player: Player,
    justLinkToTeam: boolean,
  ) {
    var ureExistingCount;
    if (!justLinkToTeam) {
      ureExistingCount = await this.ureService.findCountByParams(
        EntityType.USER,
        childUser.id,
        Role.PARENT,
        parentUser.id,
      );
      if (ureExistingCount == 0) {
        let ure = new UserRoleEntity();
        ure.entityTypeId = EntityType.USER;
        ure.entityId = childUser.id;
        ure.roleId = Role.PARENT;
        ure.userId = parentUser.id;
        ure.createdBy = parentUser.id;
        await this.ureService.createOrUpdate(ure);
      }
    }

    const promises = [];

    ureExistingCount = await this.ureService.findCountByParams(
      EntityType.TEAM,
      player.teamId,
      Role.PLAYER,
      childUser.id,
    );
    if (ureExistingCount == 0) {
      let newUserURE = new UserRoleEntity();
      newUserURE.entityTypeId = EntityType.TEAM;
      newUserURE.entityId = player.teamId;
      newUserURE.roleId = Role.PLAYER; // Player
      newUserURE.userId = childUser.id;
      newUserURE.createdBy = parentUser.id;
      promises.push(this.ureService.createOrUpdate(newUserURE));
    }

    /// Create spectator role for the parent user
    ureExistingCount = await this.ureService.findCountByParams(
      EntityType.COMPETITION,
      player.competitionId,
      Role.SPECTATOR,
      parentUser.id,
    );
    if (player.competitionId && ureExistingCount == 0) {
      let spectatorURE = new UserRoleEntity();
      spectatorURE.entityTypeId = EntityType.COMPETITION;
      spectatorURE.entityId = player.competitionId;
      spectatorURE.roleId = Role.SPECTATOR;
      spectatorURE.userId = parentUser.id;
      spectatorURE.createdBy = parentUser.id;

      promises.push(this.ureService.createOrUpdate(spectatorURE));
    }

    promises.push(this.addUserToTeamChat(player.teamId, childUser));

    player.inviteStatus = 'REGISTERED';

    promises.push(this.playerService.createOrUpdate(player));

    await Promise.all(promises);
    await this.notifyChangeRole(parentUser.id);
    await this.evaluateWatchlist(parentUser.id, player.teamId);
  }

  @Authorized()
  @Post('/modifyChildPlayerLink')
  async modifyChildPlayerLink(
    @QueryParam('playerId', { required: true }) playerId: number,
    @QueryParam('userId', { required: true }) userId: number,
    @Res() response: Response,
  ) {
    let player = await this.playerService.findById(playerId);
    let parentUser = await this.userService.findById(userId);
    const childUserPassword = md5('password');

    // Get child user
    let newChildEmail = `${parentUser.email}.${player.firstName}`;
    var childUser;
    if ((player.userId != null || player.userId != undefined) && player.userId != parentUser.id) {
      childUser = await this.userService.findById(player.userId);
    } else {
      childUser = await this.userService.findByEmail(newChildEmail.toLowerCase());
    }
    if (childUser == null || childUser == undefined) {
      childUser = new User();
      childUser.password = childUserPassword;
      childUser.firstName = player.firstName;
      childUser.lastName = player.lastName;
      childUser.dateOfBirth = player.dateOfBirth;
    }
    childUser.statusRefId = 0;
    childUser.email = newChildEmail.toLowerCase();
    childUser = await this.userService.createOrUpdate(childUser);
    await this.updateFirebaseData(childUser, childUserPassword);

    player.userId = childUser.id;
    await this.playerService.updatePlayerUserDetails(parentUser, childUser);

    // Move all the existing URE's of userId to new child which is other than parent
    const ureList = await this.ureService.findUREsOfUser(parentUser.id);
    var childUREList: UserRoleEntity[] = new Array();
    for (let ure of ureList) {
      if (
        ure.roleId != Role.PARENT &&
        ure.roleId != Role.MANAGER &&
        ure.roleId != Role.SCORER &&
        ure.roleId != Role.UMPIRE &&
        ure.roleId != Role.COACH
      ) {
        ure.userId = childUser.id;
        childUREList.push(ure);
      }
    }
    if (isArrayPopulated(childUREList)) {
      await this.ureService.batchCreateOrUpdate(childUREList);
    }

    await this.firebaseService.updateFirebaseUIDOfExistingChats(
      parentUser.firebaseUID,
      childUser.firebaseUID,
    );
    await this.linkChild(parentUser, childUser, player, false);

    return response.status(200).send({ success: true });
  }

  private async mergeURE(sourceUserId: number, targetUserId: number) {
    let sourceUREs = await this.ureService.findUREsOfUser(sourceUserId);
    let targetUREs = await this.ureService.findUREsOfUser(targetUserId);

    var updatingUREs: UserRoleEntity[] = [];
    sourceUREs.forEach(sourceURE => {
      if (
        !targetUREs.some(
          targetURE =>
            sourceURE.roleId == targetURE.roleId &&
            sourceURE.entityId == targetURE.entityId &&
            sourceURE.entityTypeId == targetURE.entityTypeId,
        )
      ) {
        sourceURE.isDeleted = 1;
      } else {
        sourceURE.userId = targetUserId;
        sourceURE.updatedBy = targetUserId;
      }
      updatingUREs.push(sourceURE);
    });
    if (isArrayPopulated(updatingUREs)) {
      await this.ureService.batchCreateOrUpdate(updatingUREs);
    }
  }

  private async evaluateWatchlist(userId: number, teamId: number) {
    let deviceIds = (await this.deviceService.getUserDevices(userId)).map(
      device => device.deviceId,
    );
    if (isArrayPopulated(deviceIds)) {
      let needToSetWatch = true;
      let userWatchlist = await this.watchlistService.findByParam(userId);
      for (let watchItem of userWatchlist) {
        if (watchItem.entityTypeId == EntityType.TEAM && teamId == watchItem.entityId) {
          needToSetWatch = false;
          break;
        }
      }

      if (needToSetWatch) {
        await this.createWatchlist(userId, teamId, deviceIds);
      }
    }
  }

  private async createWatchlist(userId: number, teamId: number, deviceIds: string[]) {
    let topics = await this.loadTopics([teamId], []);
    if (topics.length > 0) {
      await this.firebaseService.subscribeTopic(deviceIds, topics);
    }

    const watchlistSavePromises = [];
    deviceIds.forEach(async deviceId => {
      watchlistSavePromises.push(this.watchlistService.save(userId, deviceId, [], [teamId]));
    });
    await Promise.all(watchlistSavePromises);

    /// On saving of watchlist we will add the user spectator role
    /// to those team's or organisation's
    let compIds: number[] = [];
    const teamList = await this.teamService.findByIds([teamId]);
    teamList.forEach(team => {
      compIds.push(team.competitionId);
    });

    if (compIds.length > 0) {
      let existingUREs = await this.ureService.findCompetitionsUREs(
        compIds,
        Role.SPECTATOR,
        userId,
      );
      let ureList: UserRoleEntity[] = [];
      new Set(compIds).forEach(compId => {
        if (existingUREs.filter(ure => ure.entityId == compId).length == 0) {
          let spectatorURE = new UserRoleEntity();
          spectatorURE.roleId = Role.SPECTATOR;
          spectatorURE.entityId = compId;
          spectatorURE.entityTypeId = EntityType.COMPETITION;
          spectatorURE.userId = userId;
          spectatorURE.createdBy = userId;
          ureList.push(spectatorURE);
        }
      });
      await this.ureService.batchCreateOrUpdate(ureList);
      this.notifyChangeRole(userId);
    }

    this.firebaseService.sendMessageChunked({
      tokens: deviceIds,
      data: {
        type: 'watchlist_updated',
      },
    });
  }
}
