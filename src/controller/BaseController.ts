import {Inject} from "typedi";
import ClubService from "../services/ClubService";
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
import MatchUmpiresService from "../services/MatchUmpiresService";
import UserService from "../services/UserService";
import ApplicationService from "../services/ApplicationService";
import UserDeviceService from "../services/UserDeviceService";
import WatchlistService from "../services/WatchlistService";
import NewsService from "../services/NewsService";
import BannerService from "../services/BannerService";
import {User} from "../models/User";
import EventService from "../services/EventService";
import UserRoleEntityService from "../services/UserRoleEntityService";
import IncidentService from "../services/IncidentService";
import CompetitionLadderSettingsService from "../services/CompetitionLadderSettingsService";
import CompetitionVenueService from "../services/CompetitionVenueService";
import admin from "firebase-admin";

export class BaseController {

    @Inject()
    protected roundService: RoundService;

    @Inject()
    protected clubService: ClubService;

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
    protected gameTimeAttendanceService: GameTimeAttendanceService;

    @Inject()
    protected locationService: LocationService;

    @Inject()
    protected matchScorerService: MatchScoresService;

    @Inject()
    protected attendanceService: AttendanceService;

    @Inject()
    protected matchUmpireService: MatchUmpiresService;

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

    protected async updateFirebaseData(user: User, password: string) {
        user.password = password;
        let fbUser;
        if (user.firebaseUID) {
          fbUser = await this.firebaseService.loadUserByUID(user.firebaseUID);
        }

        if (!fbUser || !fbUser.uid) {
            fbUser = await this.firebaseService.createUser(user.email.toLowerCase(), password);
        } else {
            fbUser = await this.firebaseService.updateUserByUID(user.firebaseUID, user.email.toLowerCase(), user.password);
        }
        if (fbUser && fbUser.uid) {
            user.firebaseUID = fbUser.uid;
            await User.save(user);
        }

        await this.checkFirestoreDatabase(user, true);
    }

    protected async checkFirestoreDatabase(user, update = false) {
      if (user.firebaseUID) {
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
        let tokens = (await this.deviceService.getUserDevices(userId)).map(device => device.deviceId);
        if (tokens && tokens.length > 0) {
            this.firebaseService.sendMessage({
                tokens: tokens,
                data: {
                    type: 'user_role_updated'
                }
            })
        }
    }
}
