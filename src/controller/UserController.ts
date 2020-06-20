import {
    Authorized,
    Body,
    Delete,
    Get,
    HeaderParam,
    JsonController,
    Patch,
    Post,
    QueryParam,
    Req,
    Res,
    UploadedFile
} from 'routing-controllers';
import {User} from '../models/User';
import {Request, Response} from 'express';
import {logger} from '../logger';
import axios from 'axios';
import {decode as atob} from 'base-64'
import {authToken, fileExt, isNullOrEmpty, isPhoto, timestamp} from "../utils/Utils";
import {LoginError} from "../exceptions/LoginError";
import {UserDevice} from "../models/UserDevice";
import {BaseController} from "./BaseController";
import {UserRoleEntity} from "../models/security/UserRoleEntity";
import {Role} from "../models/security/Role";
import {EntityType} from "../models/security/EntityType";
import {Team} from "../models/Team";
import {Organisation} from "../models/Organisation";
import {OpenAPI} from "routing-controllers-openapi";
import FirebaseService from "../services/FirebaseService";
import { md5, isArrayPopulated } from "../utils/Utils";
import {stringTONumber, paginationData, isNotNullAndUndefined} from "../utils/Utils";

@JsonController('/users')
export class UserController extends BaseController {

    @Get('/loginWithEmailPassword')
    async login(
        @Req() request: Request,
        @QueryParam('deviceId') deviceId: string = undefined,
        @Res() response: Response
    ) {
        const auth = request.headers.authorization || "";
        if (auth.startsWith('BWSA')) {
            const token = atob(auth.replace('BWSA ', '')).split(':');
            const email = token[0].toLowerCase();
            const password = token[1];
            const user = await this.userService.findByCredentials(email, password);
            if (user) {
                return this.responseWithTokenAndUser(email, password, user, deviceId);
            } else {
                throw new LoginError();
            }
        } else {
            throw new LoginError();
        }
    }

    @Get('/loginWithFacebook')
    async loginWithFacebook(
        @QueryParam('accessToken') accessToken: string,
        @QueryParam('deviceId') deviceId: string = undefined,
        @Res() response: Response
    ) {
        try {
            const tokenResponse = await axios.get(
                'https://graph.facebook.com/v3.3/me?fields=email,first_name,last_name&access_token=' +
                accessToken
            );

            if (tokenResponse.status == 200) {
                const fbUser = tokenResponse.data;
                const user = await this.userService.findByEmail(fbUser.email.toLowerCase());
                if (!user) {
                    // We have a partial record (need to complete).
                    response.status(203)
                        .send({
                            name: 'new_user',
                            message: 'Need process registration',
                            data: {
                                first_name: fbUser.first_name,
                                last_name: fbUser.last_name,
                                email: fbUser.email.toLowerCase(),
                            }
                        });
                }
                return await this.responseWithTokenAndUser(user.email.toLowerCase(), user.password, user, deviceId);
            }
        } finally {
            response.status(404).send({name: 'validation_error', message: 'Invalid access token'});
        }
    }

    @Get('/loginWithGoogle')
    async loginWithGoogle(
        @QueryParam('idToken') idToken: string,
        @QueryParam('deviceId') deviceId: string = undefined,
        @Res() response: Response
    ) {
        try {
            const tokenResponse = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
            if (tokenResponse.status == 200) {
                const email = tokenResponse.data.email.toLowerCase();
                const user = await this.userService.findByEmail(email);
                if (!user) {
                    response.status(203).send({name: 'new_user', message: 'Need process registration'});
                    return {user: {email}};
                } else {
                    return await this.responseWithTokenAndUser(user.email.toLowerCase(), user.password, user, deviceId);
                }
            }
        } catch (e) {
            return response.status(404).send({name: 'validation_error', message: 'Invalid access token'});
        }
    }

    @Post('/signup')
    async create(
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('deviceId') deviceId: string = undefined,
        @Body() user: User,
        @Res() response: Response) {
        if (isNullOrEmpty(user.email) || isNullOrEmpty(user.password)) {
            return response
                .status(422)
                .send({name: 'validation_error', message: 'Not all required field filled'});
        }
        const existing = await this.userService.findByEmail(user.email.toLowerCase());
        if (existing) {
            logger.info(`User ${user.email} already exists.`);
            return response
                .status(400).send({
                    name: 'validation_error',
                    message: 'A user with that email address already exists.'
                });
        } else {
            logger.info(`User ${user.email} signed up.`);
            user.email = user.email.toLowerCase();
            const saved = await this.userService.createOrUpdate(user);
            if (competitionId) {
                let ure = new UserRoleEntity();
                ure.entityTypeId = EntityType.COMPETITION;
                ure.entityId = competitionId;
                ure.roleId = 5; // MEMBER
                ure.userId = saved.id;
                await this.ureService.createOrUpdate(ure);
            }
            return await this.responseWithTokenAndUser(saved.email, saved.password, saved, deviceId);
        }
    }

    @Authorized()
    @Get('/logout')
    async logout(
        @HeaderParam("authorization") user: User,
        @QueryParam('deviceId') deviceId: string = undefined,
        @Res() response: Response
    ) {
        if (user && deviceId) {
            await this.watchlistService.copyByUserId(deviceId, user.id);
            await this.deviceService.saveDevice(deviceId, undefined);
        }
        return response.status(200).send({name: 'logout', message: 'success'});
    }

    @Authorized('spectator')
    @Get('/watchlist')
    async loadWatchlist(
        @HeaderParam("authorization") user: User,
        @QueryParam('deviceId') deviceId: string = undefined,
        @Res() response: Response
    ): Promise<{ teamIds: number[], organisationIds: number[] }> {
        return this.loadUserWatchlist(user ? user.id : undefined, deviceId);
    }

    @Authorized('spectator')
    @Post('/watchlist')
    async addItemToWatchlist(
        @HeaderParam("authorization") user: User,
        @QueryParam('deviceId') deviceId: string = undefined,
        @QueryParam('teamIds') teamIds: number[] = [],
        @QueryParam('organisationIds') organisationIds: number[] = [],
        @Res() response: Response
    ): Promise<{ teamIds: number[], organisationIds: number[] }> {
        if (organisationIds && !Array.isArray(organisationIds)) organisationIds = [organisationIds];
        if (teamIds && !Array.isArray(teamIds)) teamIds = [teamIds];
        let topics = await this.loadTopics(teamIds, organisationIds);
        if (topics.length > 0) {
            await this.firebaseService.subscribeTopic(deviceId, topics)
        }
        await this.watchlistService.save(user ? user.id : undefined, deviceId, organisationIds, teamIds);
        return this.loadWatchlist(user, deviceId, response);
    }

    @Authorized('spectator')
    @Delete('/watchlist')
    async removeItemFromWatchlist(
        @HeaderParam("authorization") user: User,
        @QueryParam('deviceId') deviceId: string = undefined,
        @QueryParam('entityId') entityId: number,
        @QueryParam('entityTypeId') entityTypeId: number,
        @Res() response: Response
    ): Promise<{ teamIds: number[], organisationIds: number[] }> {
        if (entityTypeId) {
            let teamIds: number[] = [];
            if (entityTypeId == EntityType.ORGANISATION) {
                teamIds = (await this.teamService.teamByOrganisationId(entityId)).map(team => team.id);
            }
            if (entityTypeId == EntityType.TEAM) {
                teamIds.push(entityId);
            }
            let topics = teamIds.map(id => `score_team_${id}`);
            if (topics.length > 0) {
                await this.firebaseService.unsubscribeTopic(deviceId, topics)
            }
        }
        await this.watchlistService.deleteByParam(user ? user.id : undefined, deviceId, entityId, entityTypeId);
        return this.loadWatchlist(user, deviceId, response);
    }

    @Authorized()
    @Patch('/changePassword')
    async changeUserPassword(
        @HeaderParam("authorization") user: User,
        @QueryParam('password', {required: true}) password: string = undefined,
        @Res() response: Response
    ) {
        try {
            if (password) {
                user.password = password;
                await this.userService.update(user.email.toLowerCase(), user);
                logger.info(`Password successfully changed ${user.email}`);
                await this.updateFirebaseData(user, password);
                return this.responseWithTokenAndUser(user.email.toLowerCase(), password, user, undefined, false);
            } else {
                return response.status(400).send({
                    name: 'validation_error', message: 'Password field required'
                });
            }
        } catch (err) {
            logger.error(`Password not changed ${user.email}`+err);
            return response.status(400).send({
                name: 'change_error', message: 'Failed to change user password'
            });
        }
    }

    @Authorized('spectator')
    @Post('/device')
    async registerDevice(
        @HeaderParam("authorization") user: User,
        @QueryParam('deviceId') deviceId: string,
        @Res() response: Response) {
        if (deviceId.length == 0) {
            return response
                .status(428).send({
                    name: 'create_error',
                    message: `Device id can't be null => [${deviceId}]`
                });
        }
        let userId = user ? user.id : undefined;
        return this.deviceService.saveDevice(deviceId, userId);
    }

    @Authorized('spectator')
    @Delete('/device')
    async deleteDevice(
        @HeaderParam("authorization") user: User,
        @QueryParam('deviceId') deviceId: string,
        @Res() response: Response) {
        let removeDevice = await this.deviceService.removeDevice(deviceId);
        if (removeDevice['raw'].affectedRows > 0) {
            return response
                .status(200).send({
                    name: 'delete',
                    message: `Device with id ${deviceId} deleted`
                });
        } else {
            return response
                .status(200).send({
                    name: 'delete_error',
                    message: `Device with id ${deviceId} doesn't deleted`
                });
        }
    }

    @Authorized()
    @Get('/device')
    async getDevices(@HeaderParam("authorization") user: User): Promise<UserDevice[]> {
        return this.deviceService.getUserDevices(user.id);
    }

    @Authorized('spectator')
    @Patch('/device')
    async updateDevice(
        @HeaderParam("authorization") user: User,
        @QueryParam('oldDeviceId', {required: true}) oldDeviceId: string,
        @QueryParam('newDeviceId', {required: true}) newDeviceId: string,
        @Res() response: Response) {
        if (oldDeviceId && newDeviceId) {
            let watchlist = await this.loadUserWatchlist(user ? user.id : undefined, oldDeviceId);
            let topics = await this.loadTopics(watchlist.teamIds, watchlist.organisationIds);
            if (topics.length > 0) {
                await this.firebaseService.unsubscribeTopic(oldDeviceId, topics);
                await this.firebaseService.subscribeTopic(newDeviceId, topics);
            }
            let update = await this.watchlistService.updateDeviceId(oldDeviceId, newDeviceId);
            logger.debug('Watchlist device id updated', update);
            update = await this.deviceService.updateDeviceId(oldDeviceId, newDeviceId);
            logger.debug('UserDevice device id updated', update);

            return response.status(200).send({name: 'update_device', success: true});
        } else {
            return response.status(200).send({name: 'update_device', success: false});
        }
    }

    private async responseWithTokenAndUser(login, password, user: User, deviceId = undefined, checkFirebase = true) {
        await this.processingDeviceId(deviceId, user);
        if (checkFirebase) await this.checkFirebaseUser(user, password);
        user.password = undefined;
        user.reset = undefined;
        return {
            authToken: authToken(login, password),
            user: user
        };
    }

    private async processingDeviceId(deviceId: string, user) {
        //Add user to cache
        if (deviceId) {
            let watchlist = await this.loadUserWatchlist(undefined, deviceId);
            let topics = await this.loadTopics(watchlist.teamIds, watchlist.organisationIds);
            if (topics.length > 0) {
                await this.firebaseService.unsubscribeTopic(deviceId, topics)
            }

            await this.watchlistService.deleteByDeviceId(deviceId);
            await this.deviceService.saveDevice(deviceId, user.id);

            if (user) {
                let watchlist = await this.loadUserWatchlist(user.id, undefined);
                let topics = await this.loadTopics(watchlist.teamIds, watchlist.organisationIds);
                if (topics.length > 0) {
                    await this.firebaseService.subscribeTopic(deviceId, topics)
                }
            }
        }
    }

    private async loadTopics(teamIds: number[], organisationIds: number[]): Promise<string[]> {
        if (teamIds || organisationIds) {
            let listIds: number[] = [];
            if (organisationIds && organisationIds.length > 0) {
                listIds = ((await this.teamService.teamIdsByOrganisationIds(organisationIds)).map(x => x['id']));
            }
            if (teamIds && teamIds.length > 0) {
                for (const teamId of teamIds) {
                    listIds.push(teamId);
                }
            }
            listIds = Array.from(new Set(listIds));
            return listIds.map(id => `score_team_${id}`);
        }
        return [];
    }

    private async loadUserWatchlist(
        userId: number = undefined,
        deviceId: string = undefined
    ): Promise<{ teamIds: number[], organisationIds: number[] }> {
        let watchlist = [];
        if (userId) {
            watchlist = await this.watchlistService.findByParam(userId);
        } else if (deviceId) {
            watchlist = await this.watchlistService.findByParam(undefined, deviceId);
        } else {
            return {organisationIds: [], teamIds: []}
        }

        let organisationIds = watchlist.filter(item => item.entityTypeId == EntityType.ORGANISATION).map(item => item.entityId);
        let teamIds = watchlist.filter(item => item.entityTypeId == EntityType.TEAM).map(item => item.entityId);
        return {teamIds, organisationIds}
    }

    private async checkFirebaseUser(user, password: string) {
        if (!user.firebaseUID) {
            let fbUser = await this.firebaseService.loadUserByEmail(user.email.toLowerCase());
            if (!fbUser || !fbUser.uid) {
                fbUser = await this.firebaseService.createUser(user.email.toLowerCase(), password);
            }
            if (fbUser.uid) {
                user.firebaseUID = fbUser.uid;
                await User.save(user);
            }
        }
        await this.checkFirestoreDatabase(user);
    }

    @Authorized()
    @Get('/byOrgRole')
    async loadOrgUserByRole(
        @QueryParam('roleId', {required: true}) roleId: number,
        @QueryParam('organisationId', {required: true}) organisationId: number,
        @QueryParam('search') search: string,
        @QueryParam('offset') offset: number,
        @QueryParam('limit') limit: number,
    ): Promise<any> {

        const resultsFound = await this.userService.getOrgUsersBySecurity(organisationId, {roleId: roleId}, search, offset, limit);
        let result = resultsFound.result;
        for (let u of result) {
            u['organisations'] = JSON.parse(u['organisations']);
        }
        for (let u of result) {
            u['competitions'] = JSON.parse(u['competitions']);
        }

        if (resultsFound && isNotNullAndUndefined(offset) && isNotNullAndUndefined(limit)) {
            let responseObject = paginationData(stringTONumber(resultsFound.countObj), limit, offset)
            responseObject["users"] = result;
            return responseObject;
        } else {
            return resultsFound.result;
        }
    }

    @Authorized()
    @Post('/manager')
    async addManager(
        @HeaderParam("authorization") user: User,
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @Body() userData: User,
        @Res() response: Response) {

        var newUser = false;
        // if new user, search for user
        if (!userData.id) {
            if (isNullOrEmpty(userData.email)
            || isNullOrEmpty(userData.firstName)
            || isNullOrEmpty(userData.lastName)
            || isNullOrEmpty(userData.mobileNumber)) {
            return response
                .status(422)
                .send({ name: 'validation_error', message: 'Not all required fields filled' });
            }
            const foundUser = await this.userService.findByEmail(userData.email.toLowerCase());
            // if user exists in our database, validate the rest of their details
            if (foundUser) {
                if (foundUser.firstName == userData.firstName
                    && foundUser.lastName == userData.lastName
                    && foundUser.mobileNumber == userData.mobileNumber) {
                    userData.id = foundUser.id;
                } else {
                    return response
                    .status(400).send({
                        name: 'validation_error',
                        message: 'A user with this email address already exists however other details do not match'
                    });
                }
            } else {
                // create user
                newUser = true;

                var password = Math.random().toString(36).slice(-8);
                userData.email = userData.email.toLowerCase();
                userData.password = md5(password);
                const saved = await this.userService.createOrUpdate(userData);
                await this.updateFirebaseData(userData, userData.password);
                logger.info(`Manager ${userData.email} signed up.`);

                if (isArrayPopulated(userData.teams)) {
                    let competitionData = await this.competitionService.findById(competitionId)
                    this.userService.sentMail(user, userData.teams, competitionData, Role.MANAGER, saved, password);
                }

                userData.id = saved.id;
            }
        } else if (userData.firstName && userData.lastName && userData.mobileNumber) {
            let foundUser = await this.userService.findById(userData.id);
            foundUser.firstName = userData.firstName;
            foundUser.lastName = userData.lastName;
            foundUser.mobileNumber = userData.mobileNumber;
            await this.userService.createOrUpdate(foundUser);
        }

        // existing user - delete existing team assignments
        if (!newUser) {
            await this.userService.deleteRolesByUser(userData.id, Role.MANAGER, competitionId, EntityType.COMPETITION, EntityType.TEAM);
            await this.userService.deleteRolesByUser(userData.id, Role.MEMBER, competitionId, EntityType.COMPETITION, EntityType.COMPETITION);
        }

        // assign teams
        let ureArray = [];
        const managerTeamChatPromiseArray = [];
        for (let i of userData.teams) {
            let ure = new UserRoleEntity();
            ure.roleId = Role.MANAGER;
            ure.entityId = i.id;
            ure.entityTypeId = EntityType.TEAM;
            ure.userId = userData.id
            ure.createdBy = user.id;
            ureArray.push(ure);
            /// Checking manager with respect to each team for existing chat
            managerTeamChatPromiseArray.push(
              this.addUserToTeamChat(i.id, userData)
            );
        }
        let ure1 = new UserRoleEntity();
        ure1.roleId = Role.MEMBER;
        ure1.entityId = competitionId;
        ure1.entityTypeId = EntityType.COMPETITION;
        ure1.userId = userData.id
        ure1.createdBy = user.id;
        ureArray.push(ure1);
        await this.ureService.batchCreateOrUpdate(ureArray);
        await this.notifyChangeRole(userData.id);
        Promise.all(managerTeamChatPromiseArray);

        return response.status(200).send({success: true});
    }

    @Authorized()
    @Post('/coach')
    async addCoach(
        @HeaderParam("authorization") user: User,
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @Body() userData: User,
        @Res() response: Response) {

        var newUser = false;
        // if new user, search for user
        if (!userData.id) {
            if (isNullOrEmpty(userData.email)
            || isNullOrEmpty(userData.firstName)
            || isNullOrEmpty(userData.lastName)
            || isNullOrEmpty(userData.mobileNumber)) {
            return response
                .status(422)
                .send({ name: 'validation_error', message: 'Not all required fields filled' });
            }
            const foundUser = await this.userService.findByEmail(userData.email.toLowerCase());
            // if user exists in our database, validate the rest of their details
            if (foundUser) {
                if (foundUser.firstName == userData.firstName
                    && foundUser.lastName == userData.lastName
                    && foundUser.mobileNumber == userData.mobileNumber) {
                    userData.id = foundUser.id;
                } else {
                    return response
                    .status(400).send({
                        name: 'validation_error',
                        message: 'A user with this email address already exists however other details do not match'
                    });
                }
            } else {
                // create user
                newUser = true;

                var password = Math.random().toString(36).slice(-8);
                userData.email = userData.email.toLowerCase();
                userData.password = md5(password);
                const saved = await this.userService.createOrUpdate(userData);
                await this.updateFirebaseData(userData, userData.password);
                logger.info(`Coach ${userData.email} signed up.`);

                if (isArrayPopulated(userData.teams)) {
                    let competitionData = await this.competitionService.findById(competitionId)
                    this.userService.sentMail(user, userData.teams, competitionData, Role.COACH, saved, password);
                }

                userData.id = saved.id;
            }
        } else if (userData.firstName && userData.lastName && userData.mobileNumber) {
            let foundUser = await this.userService.findById(userData.id);
            foundUser.firstName = userData.firstName;
            foundUser.lastName = userData.lastName;
            foundUser.mobileNumber = userData.mobileNumber;
            await this.userService.createOrUpdate(foundUser);
        }

        // existing user - delete existing team assignments
        if (!newUser) {
            await this.userService.deleteRolesByUser(userData.id, Role.COACH, competitionId, EntityType.COMPETITION, EntityType.TEAM);
            await this.userService.deleteRolesByUser(userData.id, Role.MEMBER, competitionId, EntityType.COMPETITION, EntityType.COMPETITION);
        }

        // assign teams
        let ureArray = [];
        const coachTeamChatPromiseArray = [];
        for (let i of userData.teams) {
            let ure = new UserRoleEntity();
            ure.roleId = Role.COACH;
            ure.entityId = i.id;
            ure.entityTypeId = EntityType.TEAM;
            ure.userId = userData.id
            ure.createdBy = user.id;
            ureArray.push(ure);
            /// Checking coach with respect each team for existing chat
            coachTeamChatPromiseArray.push(
              this.addUserToTeamChat(i.id, userData)
            );
        }
        let ure1 = new UserRoleEntity();
        ure1.roleId = Role.MEMBER;
        ure1.entityId = competitionId;
        ure1.entityTypeId = EntityType.COMPETITION;
        ure1.userId = userData.id
        ure1.createdBy = user.id;
        ureArray.push(ure1);
        await this.ureService.batchCreateOrUpdate(ureArray);
        await this.notifyChangeRole(userData.id);
        Promise.all(coachTeamChatPromiseArray);

        return response.status(200).send({success: true});
    }

    @Authorized()
    @Post('/umpire')
    async addUmpire(
        @HeaderParam("authorization") user: User,
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @Body() userData: User,
        @Res() response: Response) {

        var newUser = false;
        // if new user, search for user
        if (!userData.id) {
            if (isNullOrEmpty(userData.email)
            || isNullOrEmpty(userData.firstName)
            || isNullOrEmpty(userData.lastName)
            || isNullOrEmpty(userData.mobileNumber)) {
            return response
                .status(422)
                .send({ name: 'validation_error', message: 'Not all required fields filled' });
            }
            const foundUser = await this.userService.findByEmail(userData.email.toLowerCase());
            // if user exists in our database, validate the rest of their details
            if (foundUser) {
                if (foundUser.firstName == userData.firstName
                    && foundUser.lastName == userData.lastName
                    && foundUser.mobileNumber == userData.mobileNumber) {
                    userData.id = foundUser.id;
                } else {
                    return response
                    .status(400).send({
                        name: 'validation_error',
                        message: 'A user with this email address already exists however other details do not match'
                    });
                }
            } else {
                // create user
                newUser = true;

                var password = Math.random().toString(36).slice(-8);
                userData.email = userData.email.toLowerCase();
                userData.password = md5(password);
                const saved = await this.userService.createOrUpdate(userData);
                await this.updateFirebaseData(userData, userData.password);
                logger.info(`Umpire ${userData.email} signed up.`);

                if (isArrayPopulated(userData.affiliates)) {
                    let competitionData = await this.competitionService.findById(competitionId)
                    this.userService.sentMail(user, userData.affiliates, competitionData, Role.UMPIRE, saved, password);
                }

                userData.id = saved.id;
            }
        } else if (userData.firstName && userData.lastName && userData.mobileNumber) {
            let foundUser = await this.userService.findById(userData.id);
            foundUser.firstName = userData.firstName;
            foundUser.lastName = userData.lastName;
            foundUser.mobileNumber = userData.mobileNumber;
            await this.userService.createOrUpdate(foundUser);
        }

        // existing user - delete existing team assignments
        if (!newUser) {
            await this.userService.deleteRolesByUser(userData.id, Role.UMPIRE, competitionId, EntityType.COMPETITION, EntityType.ORGANISATION);
            await this.userService.deleteRolesByUser(userData.id, Role.MEMBER, competitionId, EntityType.COMPETITION, EntityType.COMPETITION);
        }

        // assign teams
        let ureArray = [];
        for (let i of userData.affiliates) {
            let ure = new UserRoleEntity();
            ure.roleId = Role.UMPIRE;
            ure.entityId = i.id;
            ure.entityTypeId = EntityType.ORGANISATION;
            ure.userId = userData.id
            ure.createdBy = user.id;
            ureArray.push(ure);
        }
        let ure1 = new UserRoleEntity();
        ure1.roleId = Role.MEMBER;
        ure1.entityId = competitionId;
        ure1.entityTypeId = EntityType.COMPETITION;
        ure1.userId = userData.id
        ure1.createdBy = user.id;
        ureArray.push(ure1);
        await this.ureService.batchCreateOrUpdate(ureArray);
        await this.notifyChangeRole(userData.id);
        return response.status(200).send({success: true});
    }

    @Authorized()
    @Post('/member')
    async addMember(
        @HeaderParam("authorization") user: User,
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @Body() userData: User,
        @Res() response: Response) {

        var newToCompetition = true;
        // if existing user wasn't provided, search for the user
        if (!userData.id) {
            if (isNullOrEmpty(userData.email)
            || isNullOrEmpty(userData.firstName)
            || isNullOrEmpty(userData.lastName)
            || isNullOrEmpty(userData.mobileNumber)) {
            return response
                .status(422)
                .send({ name: 'validation_error', message: 'Not all required fields filled' });
            }

            const foundUser = await this.userService.findByEmail(userData.email.toLowerCase());
            // if user exists in our database, validate the rest of their details
            if (foundUser) {
                if (foundUser.firstName == userData.firstName
                    && foundUser.lastName == userData.lastName
                    && foundUser.mobileNumber == userData.mobileNumber) {
                    userData.id = foundUser.id;
                } else {
                    return response
                    .status(400).send({
                        name: 'validation_error',
                        message: 'A user with this email address already exists however other details do not match'
                    });
                }
            } else {
                // create user
                var password = Math.random().toString(36).slice(-8);
                userData.email = userData.email.toLowerCase();
                userData.password = md5(password);
                const saved = await this.userService.createOrUpdate(userData);
                await this.updateFirebaseData(userData, userData.password);
                logger.info(`Manager ${userData.email} signed up.`);

                let competitionData = await this.competitionService.findById(competitionId)
                this.userService.sentMail(user, null, competitionData, Role.MEMBER, saved, password);

                userData.id = saved.id;
            }
        } else if (userData.firstName && userData.lastName && userData.mobileNumber) {
            let foundUser = await this.userService.findById(userData.id);
            foundUser.firstName = userData.firstName;
            foundUser.lastName = userData.lastName;
            foundUser.mobileNumber = userData.mobileNumber;
            await this.userService.createOrUpdate(foundUser);

            newToCompetition = false;
        }

        // existing user - delete existing competition assignments
        if (newToCompetition) {
            let result = await this.userService.getUsersBySecurity(EntityType.COMPETITION, competitionId, userData.id, {roleId: Role.MEMBER});

            if (!isArrayPopulated(result)) {
                let ure = new UserRoleEntity();
                ure.roleId = Role.MEMBER;
                ure.entityId = competitionId;
                ure.entityTypeId = EntityType.COMPETITION;
                ure.userId = userData.id
                ure.createdBy = user.id;
                await this.ureService.createOrUpdate(ure);
                await this.notifyChangeRole(userData.id);
            }
        }

        return await this.userService.findById(userData.id);
    }

    @Authorized()
    @Post('/importCoach')
    async importCoach(
        @HeaderParam("authorization") user: User,
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @UploadedFile("file", { required: true }) file: Express.Multer.File,
        @Res() response: Response) {
        await this.importUserWithRoles(user, competitionId, Role.COACH, file, response);
    }

    @Authorized()
    @Post('/import')
    async import(
        @HeaderParam("authorization") user: User,
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @QueryParam('roleId', { required: true }) roleId: number,
        @UploadedFile("file", { required: true }) file: Express.Multer.File,
        @Res() response: Response) {
        await this.importUserWithRoles(user, competitionId, roleId, file, response);
    }

    private async importUserWithRoles (
        user: User,
        competitionId: number,
        roleId: number,
        file: Express.Multer.File,
        response: Response
    ) {

        let bufferString = file.buffer.toString('utf8');
        let arr = bufferString.split('\n');
        let jsonObj = [];
        let headers = arr[0].split(',');
        const infoMisMatchArray: any = [];
        let importSuccess: boolean = false;
        let teamRequired = roleId == Role.COACH || roleId == Role.MANAGER;
        let teamChatRequired = roleId == Role.COACH || roleId == Role.MANAGER;

        for (let i = 1; i < arr.length; i++) {
            let data = arr[i].split(',');
            let obj = {};
            for (let j = 0; j < data.length; j++) {
                if (headers[j] !== undefined) obj[headers[j].trim()] = data[j].trim();
            }
            jsonObj.push(obj);
        }

        if (isArrayPopulated(jsonObj)) {
            for (let i of jsonObj) {
                if ( teamRequired &&
                    isNotNullAndUndefined(i['Team']) && (i['Team'] != '') &&
                    isNotNullAndUndefined(i['DivisionName']) && (i['DivisionName'] != '') 
                ) {
                   // Skip entry 
                } else if ( !teamRequired &&
                    isNotNullAndUndefined(i['Organisation']) && (i['Organisation'] != '')
                ) {
                   // Skip entry 
                } else if (isNotNullAndUndefined(i['Email']) && (i['Email'] != '') &&
                    isNotNullAndUndefined(i['First Name']) && (i['First Name'] != '') &&
                    isNotNullAndUndefined(i['Last Name']) && (i['Last Name'] != '') &&
                    isNotNullAndUndefined(i['Contact No']) && (i['Contact No'] != '')) {
                    const userDetails = new User();
                    let newUser = false;
                    let teamDetailArray: any = [];
                    let orgDetailArray: any = [];
                    let savedUserDetail: User;
                    const password = Math.random().toString(36).slice(-8);

                    const foundUser = await this.userService.findByEmail(i['Email'].toLowerCase());
                    if (foundUser) {
                        newUser = false;
                        if (foundUser.firstName == i['First Name'] &&
                            foundUser.lastName == i['Last Name'] &&
                            foundUser.mobileNumber == i['Contact No']) {
                            userDetails.id = foundUser.id;
                            userDetails.email = foundUser.email;
                            userDetails.firstName = foundUser.firstName;
                            userDetails.lastName = foundUser.lastName;
                            userDetails.mobileNumber = foundUser.mobileNumber;

                            savedUserDetail = await this.userService.createOrUpdate(userDetails);
                            await this.updateFirebaseData(userDetails, userDetails.password);

                            userDetails.id = foundUser.id;

                            // await this.userService.deleteRolesByUser(userDetails.id, Role.COACH, competitionId, EntityType.COMPETITION, EntityType.TEAM);
                            // await this.userService.deleteRolesByUser(userDetails.id, Role.MEMBER, competitionId, EntityType.COMPETITION, EntityType.COMPETITION);

                        } else {
                            infoMisMatchArray.push(i['Email'].toLowerCase());
                        }

                    } else {
                        newUser = true;

                        userDetails.email = i['Email'].toLowerCase();
                        userDetails.password = md5(password);
                        userDetails.firstName = i['First Name'];
                        userDetails.lastName = i['Last Name'];
                        userDetails.mobileNumber = i['Contact No'];

                        savedUserDetail = await this.userService.createOrUpdate(userDetails);
                        await this.updateFirebaseData(userDetails, userDetails.password);

                        userDetails.id = savedUserDetail.id;
                    }

                    if (!infoMisMatchArray.includes(i['Email'])) {
                        if (teamRequired) {
                            if (isNotNullAndUndefined(i['Team'])) {
                                const teamArray = i['Team'].split(',');
                                let teamDetail: Team[];
                                if (isArrayPopulated(teamArray)) {
                                    for(let t of teamArray) {
                                        teamDetail = await this.teamService.findByNameAndCompetition(t, competitionId, i['DivisionName']);
                                        if(isArrayPopulated(teamDetail)) {
                                            teamDetailArray.push(...teamDetail);
                                        }
                                    }
                                }
                                let competitionData = await this.competitionService.findById(competitionId)
                                this.userService.sentMail(user, teamDetailArray, competitionData, roleId, savedUserDetail, password);
                            }
                        } else {
                            if (isNotNullAndUndefined(i['Organisation'])) {
                                let orgDetail: Organisation[];
                                const orgArray = i['Organisation'].split(',');
                                if (isArrayPopulated(orgArray)) {
                                    for(let t of orgArray) {
                                        //TODO find org
                                        orgDetail = await this.organisationService.findByNameAndCompetitionId(t, competitionId);
                                        if(isArrayPopulated(orgDetail)) {
                                            orgArray.push(...orgDetail);
                                        }
                                    }
                                }
                                let competitionData = await this.competitionService.findById(competitionId)
                                this.userService.sentMail(user, teamDetailArray, competitionData, roleId, savedUserDetail, password);
                            }
                        }

                        let ureArray = [];
                        const teamChatPromiseArray = [];
                        if (isArrayPopulated(teamDetailArray)) {
                            for (let i of teamDetailArray) {
                                let ure = new UserRoleEntity();
                                ure.roleId = roleId;
                                ure.entityId = i.id;
                                ure.entityTypeId = EntityType.TEAM;
                                ure.userId = userDetails.id
                                ure.createdBy = user.id;
                                ureArray.push(ure);

                                /// Checking role with respect each team for existing chat
                                if (teamChatRequired) {
                                    teamChatPromiseArray.push(
                                    this.addUserToTeamChat(i.id, userDetails)
                                    );
                                }
                            }
                            
                        } else if (isArrayPopulated(orgDetailArray)) {
                            for (let i of orgDetailArray) {
                                let ure = new UserRoleEntity();
                                ure.roleId = roleId;
                                ure.entityId = i.id;
                                ure.entityTypeId = EntityType.ORGANISATION;
                                ure.userId = userDetails.id
                                ure.createdBy = user.id;
                                ureArray.push(ure);
                            }
                        }
                        let ure1 = new UserRoleEntity();
                        ure1.roleId = Role.MEMBER;
                        ure1.entityId = competitionId;
                        ure1.entityTypeId = EntityType.COMPETITION;
                        ure1.userId = userDetails.id
                        ure1.createdBy = user.id;
                        ureArray.push(ure1);
                        await this.ureService.batchCreateOrUpdate(ureArray);
                        await this.notifyChangeRole(userDetails.id);
                        if (teamChatRequired) {
                            Promise.all(teamChatPromiseArray);
                        }
                        importSuccess = true;
                    }
                }
            }

            if (isArrayPopulated(infoMisMatchArray)) {
                return response.status(212).send(`${infoMisMatchArray.toString()} could not be added as the user already exists in our system with different details`);
            } else if (importSuccess) {
                return response.status(200).send({ success: true });
            } else {
                return response.status(212).send(`Required parameters are not filled within the file provided for importing`);
            }
        }
    }
}
