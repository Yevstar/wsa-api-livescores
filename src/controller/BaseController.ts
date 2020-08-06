import {Inject} from "typedi";
import RosterService from "../services/RosterService";
import FirebaseService from "../services/FirebaseService";
import RoundService from "../services/RoundService";
import CompetitionService from "../services/CompetitionService";
import TeamService from "../services/TeamService";
import PlayerService from "../services/PlayerService";
import DivisionService from "../services/DivisionService";
import MatchService from "../services/MatchService";
import GameTimeAttendanceService from "../services/GameTimeAttendanceService";
import LocationService from "../services/LocationService";
import MatchScoresService from "../services/MatchScoresService";
import AttendanceService from "../services/AttendanceService";
import MatchUmpireService from "../services/MatchUmpireService";
import UserService from "../services/UserService";
import ApplicationService from "../services/ApplicationService";
import UserDeviceService from "../services/UserDeviceService";
import WatchlistService from "../services/WatchlistService";
import NewsService from "../services/NewsService";
import BannerService from "../services/BannerService";
import {User} from "../models/User";
import {Roster} from "../models/security/Roster";
import {StateTimezone} from "../models/StateTimezone";
import {MatchUmpire} from "../models/MatchUmpire";
import {EntityType} from "../models/security/EntityType";
import EventService from "../services/EventService";
import UserRoleEntityService from "../services/UserRoleEntityService";
import IncidentService from "../services/IncidentService";
import CompetitionLadderSettingsService from "../services/CompetitionLadderSettingsService";
import CompetitionVenueService from "../services/CompetitionVenueService";
import admin from "firebase-admin";
import OrganisationService from "../services/OrganisationService";
import CompetitionOrganisationService from "../services/CompetitionOrganisationService";
import LineupService from "../services/LineupService";
import LadderFormatService from '../services/LadderFormatService';
import LadderFormatDivisionService from '../services/LadderFormatDivisionService';
import {convertMatchStartTimeByTimezone} from "../utils/TimeFormatterUtils";
import {isNullOrEmpty} from "../utils/Utils";
import TeamLadderService from '../services/TeamLadderService';
import MatchSheetService from "../services/MatchSheetService";

import {logger} from "../logger";

export class BaseController {

    @Inject()
    protected roundService: RoundService;

    @Inject()
    protected rosterService: RosterService;

    @Inject()
    protected firebaseService: FirebaseService;

    @Inject()
    protected competitionService: CompetitionService;

    @Inject()
    protected teamService: TeamService;

    @Inject()
    protected playerService: PlayerService;

    @Inject()
    protected divisionService: DivisionService;

    @Inject()
    protected matchService: MatchService;

    @Inject()
    protected matchSheetService: MatchSheetService;

    @Inject()
    protected gameTimeAttendanceService: GameTimeAttendanceService;

    @Inject()
    protected locationService: LocationService;

    @Inject()
    protected matchScorerService: MatchScoresService;

    @Inject()
    protected attendanceService: AttendanceService;

    @Inject()
    protected matchUmpireService: MatchUmpireService;

    @Inject()
    protected userService: UserService;

    @Inject()
    protected appService: ApplicationService;

    @Inject()
    protected deviceService: UserDeviceService;

    @Inject()
    protected watchlistService: WatchlistService;

    @Inject()
    protected newsService: NewsService;

    @Inject()
    protected bannerService: BannerService;

    @Inject()
    protected eventService: EventService;

    @Inject()
    protected ureService: UserRoleEntityService;

    @Inject()
    protected incidentService: IncidentService;

    @Inject()
    protected competitionLadderSettingsService: CompetitionLadderSettingsService;

    @Inject()
    protected competitionVenueService: CompetitionVenueService;

    @Inject()
    protected organisationService: OrganisationService;

    @Inject()
    protected lineupService: LineupService;

    @Inject()
    protected ladderFormatService: LadderFormatService;

    @Inject()
    protected ladderFormatDivisionService: LadderFormatDivisionService;

    @Inject()
    protected competitionOrganisationService: CompetitionOrganisationService;

    @Inject()
    protected teamLadderService: TeamLadderService;

    protected async updateFirebaseData(user: User, password: string) {
        user.password = password;

        let fbUser;
        /// If there an existing firebaseUID get the firebase user via that
        if (!isNullOrEmpty(user.firebaseUID)) {
          fbUser = await this.firebaseService.loadUserByUID(user.firebaseUID);
        } else {
          /// Also we will check once if there an user alreay with that email
          /// in-order to make sure we don't call create of firebase user
          /// with an already existing email.
          fbUser = await this.firebaseService.loadUserByEmail(user.email);
          if (fbUser && fbUser.uid) {
            user.firebaseUID = fbUser.uid;
          }
        }

        if (!fbUser || !fbUser.uid) {
            fbUser = await this.firebaseService.createUser(
                user.email.toLowerCase(),
                password
            );
        } else {
            if (user && isNullOrEmpty(user.firebaseUID)) {
                fbUser = await this.firebaseService.createUser(
                    user.email.toLowerCase(),
                    password
                );
            } else if (user) {
                fbUser = await this.firebaseService.updateUserByUID(
                    user.firebaseUID,
                    user.email.toLowerCase(),
                    user.password
                );
            }
        }
        if (fbUser && fbUser.uid) {
            user.firebaseUID = fbUser.uid;
            await User.save(user);
        }
        await this.checkFirestoreDatabase(user, true);
    }

    protected async checkFirestoreDatabase(user, update = false) {
      if (!isNullOrEmpty(user.firebaseUID)) {
        let db = admin.firestore();
        let usersCollectionRef = await db.collection('users');
        let queryRef = usersCollectionRef.where('uid', '==', user.firebaseUID);
        let querySnapshot = await queryRef.get();
        if (querySnapshot.empty) {
          usersCollectionRef.doc(user.firebaseUID).set({
              'email': user.email.toLowerCase(),
              'firstName': user.firstName,
              'lastName': user.lastName,
              'uid': user.firebaseUID,
              'avatar': (user.photoUrl != null && user.photoUrl != undefined) ?
                  user.photoUrl :
                  null,
              'created_at': admin.firestore.FieldValue.serverTimestamp(),
              'searchKeywords': [
                  `${user.firstName} ${user.lastName}`,
                  user.firstName,
                  user.lastName,
                  user.email.toLowerCase()
              ]
          });
        } else if (update) {
          usersCollectionRef.doc(user.firebaseUID).update({
            'email': user.email.toLowerCase(),
            'firstName': user.firstName,
            'lastName': user.lastName,
            'uid': user.firebaseUID,
            'avatar': (user.photoUrl != null && user.photoUrl != undefined) ?
                user.photoUrl :
                null,
            'updated_at': admin.firestore.FieldValue.serverTimestamp(),
            'searchKeywords': [
                `${user.firstName} ${user.lastName}`,
                user.firstName,
                user.lastName,
                user.email.toLowerCase()
            ]
          });
        }
      }
    }

    protected async notifyChangeRole(userId: number) {
        if (userId) {
            let tokens = (await this.deviceService.getUserDevices(userId)).map(device => device.deviceId);
            if (tokens && tokens.length > 0) {
                this.firebaseService.sendMessage({
                    tokens: tokens,
                    data: {
                        type: 'user_role_updated'
                    }
                });
            }
        }
    }

    protected async addUserToTeamChat(teamId: number, user: User) {
        let db = admin.firestore();
        let chatsCollectionRef = await db.collection('chats');
        let queryRef = chatsCollectionRef.where('teamId', '==', teamId);
        let querySnapshot = await queryRef.get();

        if (!querySnapshot.empty) {
            let userQueryRef = queryRef.where('uids', 'array-contains', user.firebaseUID);
            let userQuerySnapshot = await userQueryRef.get();
            if (userQuerySnapshot.empty) {
                let teamChatDoc = chatsCollectionRef.doc(`team${teamId.toString()}chat`);
                teamChatDoc.update({
                    'uids': admin.firestore.FieldValue.arrayUnion(user.firebaseUID),
                    'updated_at': admin.firestore.FieldValue.serverTimestamp()
                });
            }
            let removedUserQueryRef = queryRef.where('removed_uids', 'array-contains', user.firebaseUID);
            let removedUserQuerySnapshot = await removedUserQueryRef.get();
            if (!removedUserQuerySnapshot.empty) {
                let teamChatDoc = chatsCollectionRef.doc(`team${teamId.toString()}chat`);
                teamChatDoc.update({
                    'removed_uids': admin.firestore.FieldValue.arrayRemove(user.firebaseUID),
                    'updated_at': admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
    }

    protected async notifyRosterChange(user: User, roster: Roster, category: "Scoring" | "Playing" | "Event" | "Umpiring") {
        switch (category) {
            case "Scoring":
              let tokens = [];
              let managerDeviceTokens = (await this.deviceService.findManagerDevice(roster.teamId)).map(device => device.deviceId);
              if (managerDeviceTokens && managerDeviceTokens.length > 0) {
                  Array.prototype.push.apply(tokens, managerDeviceTokens);
              }
              let scorerDeviceTokens = (await this.deviceService.findScorerDeviceFromRoster(roster.matchId, roster.id)).map(device => device.deviceId);
              if (scorerDeviceTokens && scorerDeviceTokens.length > 0) {
                  Array.prototype.push.apply(tokens, scorerDeviceTokens);
              }

              if (tokens && tokens.length > 0) {
                  let uniqTokens = new Set(tokens);
                  this.firebaseService.sendMessage({
                    tokens: Array.from(uniqTokens),
                    data: {type: 'add_scorer_match', rosterId: roster.id.toString(),
                      matchId: roster.matchId.toString()}
                  });
              }
              break;
            case "Playing":
              let managerAndCoachDeviceTokens = (await this.deviceService.findManagerAndCoachDevices(roster.teamId)).map(device => device.deviceId);
              if (managerAndCoachDeviceTokens && managerAndCoachDeviceTokens.length > 0) {
                  this.firebaseService.sendMessage({
                    tokens: managerAndCoachDeviceTokens,
                    data: {type: 'player_status_update', entityTypeId: EntityType.USER.toString(),
                    entityId: user.id.toString(), matchId: roster.matchId.toString()}
                  });
              }
              break;
            case "Event":
              let eventDeviceTokens = (await this.deviceService.getUserDevices(roster.eventOccurrence.created_by)).map(device => device.deviceId);
              if (eventDeviceTokens && eventDeviceTokens.length > 0) {
                  this.firebaseService.sendMessage({
                    tokens: eventDeviceTokens,
                    data: {
                      type: 'event_invitee_update', entityTypeId: EntityType.USER.toString(),
                      entityId: user.id.toString(), eventOccurrenceId: roster.eventOccurrenceId.toString()
                    }
                  });
              }
              break;
          }
    }

    public async umpireAddRoster(matchUmpire: MatchUmpire, rosterLocked: boolean) {
      let umpireRole = await this.userService.getRole("umpire");
      let user = await this.userService.findById(matchUmpire.userId);
      let match = await this.matchService.findMatchById(matchUmpire.matchId);

      let umpireRoster = new Roster();
      umpireRoster.roleId = umpireRole;
      umpireRoster.matchId = matchUmpire.matchId;
      umpireRoster.userId = matchUmpire.userId;
      if ((rosterLocked != null || rosterLocked != undefined) && rosterLocked) {
          umpireRoster.locked = rosterLocked;
          umpireRoster.status = "YES";
      }
      let savedRoster = await this.rosterService.createOrUpdate(umpireRoster);
      if (savedRoster) {
        let tokens = (await this.deviceService.getUserDevices(umpireRoster.userId)).map(device => device.deviceId);
        if (tokens && tokens.length > 0) {
          try {
            if (match.competition && match.competition.location && match.competition.location.id) {
              let constants = require('../constants/Constants');
              let stateTimezone: StateTimezone = await this.matchService.getMatchTimezone(match.competition.locationId);
              let matchTime = convertMatchStartTimeByTimezone(
                  match.startTime,
                  stateTimezone != null ? stateTimezone.timezone : null,
                  `${constants.DATE_FORMATTER_KEY} at ${constants.TIME_FORMATTER_KEY}`
              );

              let messageBody = '';
              if (rosterLocked) {
                messageBody = `${match.competition.name} has sent you a ` +
                        `new Umpiring Duty for ${matchTime}.`;
              } else {
                messageBody = `${match.competition.name} has sent you a ` +
                        `new Umpiring Duty for ${matchTime}. ` +
                        `Please log into your Netball Live Scores ` +
                        `App to accept/decline.`;
              }
              this.firebaseService.sendMessageChunked({
                  tokens: tokens,
                  title: `Hi ${matchUmpire.umpireName}`,
                  body: messageBody,
                  data: {
                      type: 'add_umpire_match',
                      matchId: savedRoster.matchId.toString(),
                      rosterId: savedRoster.id.toString()
                  }
              });
            }
          } catch (e) {
              logger.error(`Failed to send notification to umpire with error -`, e);
          }
        }
      }
    }

    public async umpireRemoveRoster(matchUmpire: MatchUmpire) {
      let umpireRole = await this.userService.getRole("umpire");
      let roster = await this.rosterService.findByParams(umpireRole.id, matchUmpire.userId, matchUmpire.matchId);
      if (roster) {
          let result = await this.rosterService.delete(roster);
          if (result) {
              let tokens = (await this.deviceService.getUserDevices(matchUmpire.userId)).map(device => device.deviceId);
              if (tokens && tokens.length > 0) {
                  this.firebaseService.sendMessageChunked({
                      tokens: tokens,
                      data: {
                          type: 'remove_umpire_match',
                          rosterId: roster.id.toString(),
                          matchId: roster.matchId.toString()
                      }
                  })
              }
          }
      }
    }
}
