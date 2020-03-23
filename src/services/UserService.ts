import {Service} from "typedi";
import {User} from "../models/User";
import BaseService from "./BaseService";
import {Role} from "../models/security/Role";
import {EntityType} from "../models/security/EntityType";
import { logger } from '../logger';
import nodeMailer from "nodemailer";

@Service()
export default class UserService extends BaseService<User> {

    modelName(): string {
        return User.name;
    }

    public async findByCredentials(email: string, password: string): Promise<User> {
        return this.entityManager.createQueryBuilder(User, 'user')
            .andWhere('LOWER(user.email) = :email and user.password = :password',
                {email: email, password: password})
            .getOne();
    }

    public async findByEmail(email: string): Promise<User> {
        return this.entityManager.createQueryBuilder(User, 'user')
            .andWhere('LOWER(user.email) = :email', {email: email})
            .addSelect("user.password").addSelect("user.reset")
            .getOne();
    }

    public async userExist(email: string): Promise<number> {
        return this.entityManager.createQueryBuilder(User, 'user')
            .where('user.email = :email', {email})
            .getCount()
    }

    public async update(email: string, user: User) {
        return this.entityManager.createQueryBuilder(User, 'user')
            .update(User)
            .set(user)
            .andWhere('user.email = :email', {email})
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

    public async deleteRolesByUser(userId: number, inputEntityId: number, linkedEntityTypeId: number) {
        try {
            let result = await this.entityManager.query("call wsa_users.usp_delete_entity_roles_by_user(?,?,?)",[userId, inputEntityId, linkedEntityTypeId]);
            return result[0];
        } catch(error) {
            throw error;
        }
    }

    public async sentMail(userData, teamData, competitionData, mailTo, receiverData, password) {


        let url = `https://netballivescores://wsa.app/link`;
        logger.info(`TeamService - sendMail : url ${url}`);
        let html = ``;
        let subject = '';
        if (mailTo == 'manager') {
            if (teamData.length == 1) {
                subject = 'Invite Mail';
                html = `<!DOCTYPE html >
                        <html>
                            <head>
                                <title>Registration Mail</title>
                            </head>
                            <body >
                                <p>Hi ${receiverData.firstName} ${receiverData.lastName},
                                <p> ${userData.firstName} ${userData.lastName} has advised us that you are the manager of team  ${teamData[0].name}. As ${competitionData.name} are using Live Scoring for this competition we require you to click <a href="${url}">here</a > to download the "APP_NAME" and start assigning who  will score your team’s matches.Please note, you can choose to give this responsibility to someone else or score the games yourself.
                                <p> Your password is { { ${password} } } - you can change it when you log in if you would like.
                                <p> We hope you enjoy using Netball Live Scores.
                                <p> The Netball Live Scores Team
                            </body>
                        </html>`

            } else if (teamData.length > 1) {
                var teamNames = teamData.map(o => o.name).join(', ');
                subject = 'Invite Mail';
                html = `<!DOCTYPE html >
                        <html>
                            <head>
                                <title>Registration Mail</title>
                            </head>
                            <body >
                                <p>Hi ${receiverData.firstName} ${receiverData.lastName},
                                <p> ${userData.firstName} ${userData.lastName} has advised us that you are the manager of the following teams: " ${teamNames}". As ${competitionData.name} are using Live Scoring for this competition we require you to click <a href="${url}">here</a > to download the "APP_NAME" and start assigning who  will score your team’s matches.Please note, you can choose to give this responsibility to someone else or score the games yourself.
                                <p> Your password is { { ${password} } } - you can change it when you log in if you would like.
                                <p> We hope you enjoy using Netball Live Scores.
                                <p> The Netball Live Scores Team
                            </body>
                        </html>`
            }

        } else if (mailTo == 'member') {
            subject = 'Invite Mail';
            html = `<!DOCTYPE html>
                    <html>
                        <head>
                            <title>Registration Mail</title>
                        </head>
                        <body>
                            <p>Hi ${receiverData.firstName} ${receiverData.lastName},
                            <p>${userData.firstName} ${userData.lastName} has invited you to score for team ${teamData.name} Netball game. Click <a href="${url}">here</a> to download the Netball Live Scores App and start scoring. 
                            <p>Your password is {{${password}}} - you can change it when you log in if you would like.
                            <p>We hope you enjoy using Netball Live Scores.
                            <p>The Netball Live Scores Team
                        </body>
                    </html>`

        } else if (mailTo == 'admin') {
            subject = 'Invite Mail';
            html = `<!DOCTYPE html >
                        <html>
                            <head>
                                <title>Registration Mail</title>
                            </head>
                            <body>
                                <p>Hi ${receiverData.firstName} ${receiverData.lastName},    <p>${userData.firstName} ${userData.lastName} has invited you to be an administrator of the ${competitionData.name} competition. Click <a href="${process.env.liveScoresWebHost}/login">here</a> to get started.
                                <p>Your password is ${password} - you can change it when you log in if you would like.
                                <p>We hope you enjoy using Netball Live Scores.
                                <p>The Netball Live Scores Team</p>
                            </body>
                        </html>`

        } else if (mailTo == 'superAdmin') {

            subject = 'Invite Mail';
            html = `<!DOCTYPE html >
                        <html>
                            <head>
                                <title>Registration Mail</title>
                            </head>
                            <body>
                                <p>Hi ${receiverData.firstName} ${receiverData.lastName},    <p>${userData.firstName} ${userData.lastName} has invited you to be as a super admin. Click <a href="${process.env.liveScoresWebHost}/login">here</a> to get started.
                                <p>Your password is ${password} - you can change it when you log in if you would like.
                                <p>We hope you enjoy using Netball Live Scores.
                                <p>The Netball Live Scores Team</p>
                            </body>
                        </html>`

        }

        const transporter = nodeMailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.AUTHEMAIL, // generated ethereal user
                pass: process.env.AUTHPASSWORD // generated ethereal password
            },

            tls: {
                // do not fail on invalid certs
                rejectUnauthorized: false
            }

        });

        const mailOptions = {
            from: {
                name: "World Sport Action",
                address: "admin@worldsportaction.com"
            },
            to: receiverData.email,
            replyTo: "donotreply@worldsportaction.com",
            subject: subject,
            html: html

        };

        logger.info(`TeamService - sendMail : mailOptions ${mailOptions}`);
        await transporter.sendMail(mailOptions, (err, info) => {
            logger.info(`TeamService - sendMail : ${err}, ${info}`);
            return Promise.resolve();
        });


    }
}
