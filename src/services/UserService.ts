import {Service} from "typedi";
import {User} from "../models/User";
import BaseService from "./BaseService";
import {Role} from "../models/security/Role";
import {Function} from "../models/security/Function";
import {EntityType} from "../models/security/EntityType";
import {UserRoleEntity} from "../models/security/UserRoleEntity";
import {RoleFunction} from "../models/security/RoleFunction";
import {LinkedCompetitionOrganisation} from "../models/LinkedCompetitionOrganisation";
import {Competition} from "../models/Competition";
import {logger} from '../logger';
import nodeMailer from "nodemailer";
import {LinkedEntities} from "../models/views/LinkedEntities";
import {LinkedOrganisations} from "../models/views/LinkedOrganisations";
import {Brackets} from "typeorm";
import AppConstants from "../utils/AppConstants";
import { CommunicationTrack } from "../models/CommunicationTrack";

@Service()
export default class UserService extends BaseService<User> {

    modelName(): string {
        return User.name;
    }

    public async findByCredentials(email: string, password: string): Promise<User> {
        return this.entityManager.createQueryBuilder(User, 'user')
            .andWhere('LOWER(user.email) = :email and user.password = :password',
                {email: email.toLowerCase(), password: password})
            .getOne();
    }

    public async findByEmail(email: string): Promise<User> {
        return this.entityManager.createQueryBuilder(User, 'user')
            .andWhere('LOWER(user.email) = :email', {email: email.toLowerCase()})
            .addSelect("user.password").addSelect("user.reset")
            .getOne();
    }

    public async userExist(email: string): Promise<number> {
        return this.entityManager.createQueryBuilder(User, 'user')
            .where('LOWER(user.email) = :email', {email: email.toLowerCase()})
            .getCount()
    }

    public async update(email: string, user: User) {
        return this.entityManager.createQueryBuilder(User, 'user')
            .update(User)
            .set(user)
            .andWhere('LOWER(user.email) = :email', {email: email.toLowerCase()})
            .execute();
    }

    public async getRole(roleName: string): Promise<any> {
        return this.entityManager.createQueryBuilder(Role, 'r')
            .select(['r.id as id', 'r.name as name'])
            .where('r.name = :roleName', {roleName})
            .getRawOne();
    }

    public async getEntityType(entityTypeName: string): Promise<any> {
        return this.entityManager.createQueryBuilder(EntityType, 'et')
            .select(['et.id as id', 'et.name as name'])
            .where('et.name = :entityTypeName', {entityTypeName})
            .getRawOne();
    }

    public async getFunction(functionName: string): Promise<Function> {
        return this.entityManager.createQueryBuilder(Function, 'fc')
            .select(['fc.id as id', 'fc.name as name'])
            .andWhere('fc.name = :functionName', {functionName})
            .andWhere('fc.isDeleted = 0')
            .getRawOne();
    }

    public async getFunctionRoles(functionId: number): Promise<RoleFunction[]> {
        return this.entityManager.createQueryBuilder(RoleFunction, 'rf')
            .where('rf.functionId = :functionId', {functionId})
            .getMany();
    }

    public async deleteRolesByUser(userId: number, roleId:number, inputEntityId: number, inputEntityTypeId: number, linkedEntityTypeId: number) {
        try {
            let result = await this.entityManager.query("call wsa_users.usp_delete_entity_roles_by_user(?,?,?,?,?)",[userId, roleId, inputEntityId, inputEntityTypeId, linkedEntityTypeId]);
            return result[0];
        } catch(error) {
            throw error;
        }
    }

    public async getUsersBySecurity(entityTypeId: number, entityId: number, userId: number,
        sec: { functionId?: number, roleId?: number }): Promise<User[]> {
        let query = this.entityManager.createQueryBuilder(User, 'u')
        .select('u.id as id')
        .innerJoin(UserRoleEntity, 'ure', 'u.id = ure.userId')
        .innerJoin(RoleFunction, 'fr', 'fr.roleId = ure.roleId');

        if (sec.functionId) {
            let id = sec.functionId;
            query.innerJoin(Function, 'f', 'f.id = fr.functionId')
            .andWhere('f.id = :id', {id});
        }

        if (sec.roleId) {
            let id = sec.roleId;
            query.innerJoin(Role, 'r', 'r.id = fr.roleId')
            .andWhere('r.id = :id', {id});
        }

        if (userId) {
            query.andWhere('u.id = :userId', {userId});
        }
        return query.getRawMany();
    }

    public async getOrgUsersBySecurity(organisationId: number,
        sec: { functionId?: number, roleId?: number }, search: string, offset: number, limit: number): Promise<any> {
        let query = this.entityManager.createQueryBuilder(User, 'u')
        .select(['u.id as id', 'LOWER(u.email) as email', 'u.firstName as firstName', 'u.lastName as lastName',
        'u.mobileNumber as mobileNumber', 'u.genderRefId as genderRefId',
        'u.marketingOptIn as marketingOptIn', 'u.photoUrl as photoUrl',
        'u.firebaseUID as firebaseUID', 'u.statusRefId as statusRefId'])
        .addSelect('concat(\'[\', group_concat(distinct JSON_OBJECT(\'name\', c.name)),\']\') as competitions')
        .addSelect('concat(\'[\', group_concat(distinct JSON_OBJECT(\'name\', o.linkedOrganisationName)),\']\') as organisations')
        .innerJoin(UserRoleEntity, 'ure', 'u.id = ure.userId')
        .innerJoin(LinkedCompetitionOrganisation, 'co', 'co.id = ure.entityId')
        .innerJoin(Competition, 'c', 'co.competitionid = c.id')
        .innerJoin(LinkedOrganisations, 'o', 'o.linkedOrganisationId = co.organisationId');

        // if (sec.functionId) {
        // let id = sec.functionId;
        // query.innerJoin(Function, 'f', 'f.id = fr.functionId')
        // .andWhere('f.id = :id', {id});
        // }

        if (sec.roleId) {
            let id = sec.roleId;
             query.andWhere('ure.roleId = :id', {id});
        }

        let orgEntityId = EntityType.ORGANISATION;
        query.andWhere('ure.entityTypeId = :orgEntityId', {orgEntityId})
        .andWhere('o.inputOrganisationId = :organisationId', {organisationId});

        if (search) {
            query.andWhere(new Brackets(qb => {
            qb.andWhere('LOWER(u.firstName) like :query', {query: `${search.toLowerCase()}%`})
            .orWhere('LOWER(u.lastName) like :query', {query: `${search.toLowerCase()}%`});
            }));
        }
        query.groupBy('u.id');

        if (limit) {
            const countObj = await query.getCount()
            const result = await query.skip(offset).take(limit).getRawMany();
            return {countObj,result}
        } else {
            const countObj = null;
            const result = await query.getRawMany();
            return {countObj, result}
        }
    }

    public async findByParam(firstName: string, lastName: string, mobileNumber: String, dateOfBirth: Date): Promise<User[]> {
        let query = this.entityManager.createQueryBuilder(User, 'u')
        .select(['u.id as id', 'LOWER(u.email) as email', 'u.firstName as firstName', 'u.lastName as lastName',
        'u.mobileNumber as mobileNumber', 'u.genderRefId as genderRefId',
        'u.marketingOptIn as marketingOptIn', 'u.photoUrl as photoUrl',
        'u.firebaseUID as firebaseUID', 'u.statusRefId as statusRefId', 'u.dateOfBirth as dateOfBirth'])
        .leftJoin(UserRoleEntity, 'ure', 'u.id = ure.userId');

        if (firstName) {
            query.andWhere('u.firstName = :firstName', {firstName});
        }
        if (lastName) {
            query.andWhere('u.lastName = :lastName', {lastName});
        }
        if (mobileNumber) {
            query.andWhere('u.mobileNumber = :mobileNumber', {mobileNumber});
        }
        // if (dateOfBirth) {
        //     query.andWhere('u.dateOfBirth = :dateOfBirth', {dateOfBirth});
        // }
        return query.getRawMany();
    }

    public async sentMail(
        userData: User,
        teamData,
        competitionData: Competition,
        toRoleId: number,
        receiverData: User,
        password: string

    ) {
        let html = ``;
        let subject = 'Invite Mail';

        if (toRoleId == Role.MANAGER) {
            if (teamData.length == 1) {
                html = `<!DOCTYPE html >
                        <html>
                            <head>
                                <title>Registration Mail</title>
                            </head>
                            <body >
                                <p>Hi ${receiverData.firstName} ${receiverData.lastName},
                                <p> ${userData.firstName} ${userData.lastName} has
                                advised us that you are the manager of team ${teamData[0].name}.
                                As ${competitionData.name} are using Live Scoring
                                for this competition we require you to download the Netball LiveScores App from the
                                <a href='https://itunes.apple.com/au/app/netball-live-scores/id1456225408'>App Store</a> or
                                <a href='https://play.google.com/store/apps/details?id=com.wsa.netball&hl=en_AU'>Google Play</a>
                                and start assigning who  will score your team’s matches. Please note,
                                you can choose to give this responsibility to someone else or score the games yourself.
                                <p> Your password is <b>${password}</b> - you can change it when you log in if you would like.
                                <p> We hope you enjoy using Netball Live Scores.
                                <p> The Netball Live Scores Team
                            </body>
                        </html>`

            } else if (teamData.length > 1) {
                var teamNames = teamData.map(o => o.name).join(', ');
                html = `<!DOCTYPE html >
                        <html>
                            <head>
                                <title>Registration Mail</title>
                            </head>
                            <body >
                                <p>Hi ${receiverData.firstName} ${receiverData.lastName},
                                <p> ${userData.firstName} ${userData.lastName} has advised
                                us that you are the manager of the following teams:
                                ${teamNames}. As ${competitionData.name} are using Live
                                Scoring for this competition we require you to
                                download the Netball LiveScores App from the <a href='https://itunes.apple.com/au/app/netball-live-scores/id1456225408'>App Store</a> or
                                <a href='https://play.google.com/store/apps/details?id=com.wsa.netball&hl=en_AU'>Google Play</a>
                                and start assigning who  will score your team’s matches. Please note,
                                you can choose to give this responsibility to someone else or score the games yourself.
                                <p> Your password is <b>${password}</b> - you can change it when you log in if you would like.
                                <p> We hope you enjoy using Netball Live Scores.
                                <p> The Netball Live Scores Team
                            </body>
                        </html>`
            }
        } else if (toRoleId ==  Role.COACH) {
            if (teamData.length == 1) {
                html = `<!DOCTYPE html >
                        <html>
                            <head>
                                <title>Registration Mail</title>
                            </head>
                            <body >
                                <p>Hi ${receiverData.firstName} ${receiverData.lastName},
                                <p> ${userData.firstName} ${userData.lastName} has advised us
                                that you are the coach of team ${teamData[0].name}. As
                                ${competitionData.name} are using Live Scoring for this competition
                                we require you to download the Netball LiveScores App from the <a href='https://itunes.apple.com/au/app/netball-live-scores/id1456225408'>App Store</a> or
                                <a href='https://play.google.com/store/apps/details?id=com.wsa.netball&hl=en_AU'>Google Play</a>
                                and start assigning who will score your team’s matches.
                                Please note, you can choose to give this responsibility to someone else or score the games yourself.
                                <p> Your password is <b>${password}</b> - you can change it when you log in if you would like.
                                <p> We hope you enjoy using Netball Live Scores.
                                <p> The Netball Live Scores Team
                            </body>
                        </html>`

            } else if (teamData.length > 1) {
                var teamNames = teamData.map(o => o.name).join(', ');
                html = `<!DOCTYPE html >
                        <html>
                            <head>
                                <title>Registration Mail</title>
                            </head>
                            <body >
                                <p>Hi ${receiverData.firstName} ${receiverData.lastName},
                                <p> ${userData.firstName} ${userData.lastName} has advised
                                us that you are the coach of the following teams: ${teamNames}.
                                As ${competitionData.name} are using Live Scoring for this
                                competition we require you to download the Netball LiveScores App from the <a href='https://itunes.apple.com/au/app/netball-live-scores/id1456225408'>App Store</a> or
                                <a href='https://play.google.com/store/apps/details?id=com.wsa.netball&hl=en_AU'>Google Play</a>
                                and start assigning who will score your team’s matches.
                                Please note, you can choose to give this responsibility to someone else or score the games yourself.
                                <p> Your password is <b>${password}</b> - you can change it when you log in if you would like.
                                <p> We hope you enjoy using Netball Live Scores.
                                <p> The Netball Live Scores Team
                            </body>
                        </html>`
            }
        } else if (toRoleId == Role.UMPIRE || toRoleId == Role.UMPIRE_COACH) {
            html = `<!DOCTYPE html >
                    <html>
                        <head>
                            <title>Registration Mail</title>
                        </head>
                        <body >
                            <p>Hi ${receiverData.firstName} ${receiverData.lastName},
                            <p>${userData.firstName} ${userData.lastName}, ${competitionData.competitionOrganisation.name} has invited you
                            to umpire for the ${competitionData.name}. Download the Netball LiveScores App from the <a href='https://itunes.apple.com/au/app/netball-live-scores/id1456225408'>App Store</a> or
                            <a href='https://play.google.com/store/apps/details?id=com.wsa.netball&hl=en_AU'>Google Play</a> and start umpiring.
                            <p> Your password is <b>${password}</b> - you can change it when you log in if you would like.
                            <p> We hope you enjoy using Netball Live Scores.
                            <p> The Netball Live Scores Team
                        </body>
                    </html>`
        } else if (toRoleId == Role.MEMBER) {
            html = `<!DOCTYPE html>
                    <html>
                        <head>
                            <title>Registration Mail</title>
                        </head>
                        <body>
                            <p>Hi ${receiverData.firstName} ${receiverData.lastName},
                            <p>${userData.firstName} ${userData.lastName} has invited you
                            to score for the ${competitionData.name} competition.
                            Download the Netball LiveScores App from the <a href='https://itunes.apple.com/au/app/netball-live-scores/id1456225408'>App Store</a> or
                            <a href='https://play.google.com/store/apps/details?id=com.wsa.netball&hl=en_AU'>Google Play</a> and start scoring.
                            <p>Your password is <b>${password}</b> - you can change it when you log in if you would like.
                            <p>We hope you enjoy using Netball Live Scores.
                            <p>The Netball Live Scores Team
                        </body>
                    </html>`

        }

        const transporter = nodeMailer.createTransport({
            host: "smtp.gmail.com",
            port: 465, // 465 for secure and 587 for non secure
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.MAIL_USERNAME, // generated ethereal user
                pass: process.env.MAIL_PASSWORD // generated ethereal password
            },

            tls: {
                // do not fail on invalid certs
                rejectUnauthorized: false
            }

        });

        const mailOptions = {
            from: {
                name: "World Sport Action",
                address: process.env.MAIL_USERNAME
            },
            to: receiverData.email.toLowerCase(),
            replyTo: "donotreply@worldsportaction.com",
            subject: subject,
            html: html

        };
        if(Number(process.env.SOURCE_MAIL) == 1){
            mailOptions.html = ' To: '+mailOptions.to + '<br><br>'+ mailOptions.html
            mailOptions.to = process.env.TEMP_DEV_EMAIL
        }
        logger.info(`UserService - sendMail : mailOptions ${mailOptions}`);
        let cTrack = new CommunicationTrack();
        try{
            cTrack.id= 0;

            cTrack.communicationType = 11;
            //cTrack.contactNumber = receiverData.mobileNumber
            cTrack.entityId = receiverData.id;
            cTrack.deliveryChannelRefId = 1;
            cTrack.emailId = receiverData.email;
            cTrack.userId = receiverData.id;
            cTrack.subject = mailOptions.subject;
            //cTrack.content = mailOptions.html;
            cTrack.createdBy = userData.id;
        await transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                logger.error(`UserService - sendMail : ${err}`);
                cTrack.statusRefId = 2;
                html = html.replace(password,"******")
                cTrack.content = html;
                this.insertIntoCommunicationTrack(cTrack);
                // Here i commented the below code as the caller is not handling the promise reject
                // return Promise.reject(err);
            } else {
                cTrack.statusRefId = 1;
                logger.info('UserService - sendMail : Mail sent successfully');
                html = html.replace(password,"******")
                cTrack.content = html;
                this.insertIntoCommunicationTrack(cTrack);
            }
            transporter.close();
            return Promise.resolve();
        });

    }catch(error){
        //cTrack.statusRefId = 2;
    }
    }

    public async getUsersByOptions(entityTypeId: number, entityIdList: number[], userName: string,
                                    sec: { functionId?: number, roleId?: number }): Promise<User[]> {
        let query = this.entityManager.createQueryBuilder(User, 'u')
            .select(['u.id as id', 'LOWER(u.email) as email', 'u.firstName as firstName', 'u.lastName as lastName',
                'u.mobileNumber as mobileNumber', 'u.genderRefId as genderRefId',
                'u.marketingOptIn as marketingOptIn', 'u.photoUrl as photoUrl', 'u.firebaseUID as firebaseUID'])
            .addSelect('concat(\'[\', group_concat(distinct JSON_OBJECT(\'entityTypeId\', ' +
                'le.linkedEntityTypeId, \'entityId\', le.linkedEntityId, \'name\', le.linkedEntityName)),\']\') ' +
                'as linkedEntity')
            .innerJoin(UserRoleEntity, 'ure', 'u.id = ure.userId')
            .innerJoin(RoleFunction, 'fr', 'fr.roleId = ure.roleId')
            .innerJoin(LinkedEntities, 'le', 'le.linkedEntityTypeId = ure.entityTypeId AND ' +
                'le.linkedEntityId = ure.entityId');

        if (sec.functionId) {
            let id = sec.functionId;
            query.innerJoin(Function, 'f', 'f.id = fr.functionId')
                .andWhere('f.id = :id', {id});
        }

        if (sec.roleId) {
            let id = sec.roleId;
            query.innerJoin(Role, 'r', 'r.id = fr.roleId')
                .andWhere('r.id = :id', {id});
        }

        query.andWhere('le.inputEntityTypeId = :entityTypeId', {entityTypeId})
            .andWhere('le.inputEntityId in (:entityIdList)', {entityIdList: entityIdList});

        if (userName) {
            query.andWhere(new Brackets(qb => {
                qb.andWhere('LOWER(u.firstName) like :query', {query: `${userName.toLowerCase()}%`})
                    .orWhere('LOWER(u.lastName) like :query', {query: `${userName.toLowerCase()}%`});
            }));
        }
        query.groupBy('u.id');
        return query.getRawMany()
    }

    public async getUserIdBySecurity(entityTypeId: number, entityIdList: [number], userName: string,
        sec: { functionId?: number, roleId?: number }): Promise<User[]> {
        let query = this.entityManager.createQueryBuilder(User, 'u')
        .select(['u.id'])
        .innerJoin(UserRoleEntity, 'ure', 'u.id = ure.userId')
        .innerJoin(RoleFunction, 'fr', 'fr.roleId = ure.roleId')
        .innerJoin(LinkedEntities, 'le', 'le.linkedEntityTypeId = ure.entityTypeId AND ' +
            'le.linkedEntityId = ure.entityId');

        if (sec.functionId) {
            let id = sec.functionId;
            query.innerJoin(Function, 'f', 'f.id = fr.functionId')
            .andWhere('f.id = :id', {id});
        }

        if (sec.roleId) {
            let id = sec.roleId;
            query.innerJoin(Role, 'r', 'r.id = fr.roleId')
            .andWhere('r.id = :id', {id});
        }

        query.andWhere('le.inputEntityTypeId = :entityTypeId', {entityTypeId})
        .andWhere('le.inputEntityId in (:entityIdList)', {entityIdList: entityIdList});

        if (userName) {
            query.andWhere(new Brackets(qb => {
            qb.andWhere('LOWER(u.firstName) like :query', {query: `${userName.toLowerCase()}%`})
            .orWhere('LOWER(u.lastName) like :query', {query: `${userName.toLowerCase()}%`});
            }));
        }
        return query.getMany();
    }

    public async findUserFullDetailsById(id: number): Promise<User> {
        return await this.entityManager.query(
            'select * from wsa_users.user user where user.id = ?;'
            , [id]);
    }

    public async insertIntoCommunicationTrack(ctrack : CommunicationTrack ) {
        await this.entityManager.query(`insert into wsa_common.communicationTrack(id, emailId,content,subject,contactNumber,userId,entityId,communicationType,statusRefId,deliveryChannelRefId,createdBy) values(?,?,?,?,?,?,?,?,?,?,?)`,
        [ctrack.id,ctrack.emailId,ctrack.content,ctrack.subject,ctrack.contactNumber,ctrack.userId,ctrack.entityId,ctrack.communicationType,ctrack.statusRefId,ctrack.deliveryChannelRefId,ctrack.createdBy]);
    }
}
