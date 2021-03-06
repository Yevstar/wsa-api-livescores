import { Brackets } from 'typeorm';
import { Service } from 'typedi';
import nodeMailer from 'nodemailer';

import { User } from '../models/User';
import BaseService from './BaseService';
import { Role } from '../models/security/Role';
import { Function } from '../models/security/Function';
import { EntityType } from '../models/security/EntityType';
import { UserRoleEntity } from '../models/security/UserRoleEntity';
import { RoleFunction } from '../models/security/RoleFunction';
import { LinkedCompetitionOrganisation } from '../models/LinkedCompetitionOrganisation';
import { Competition } from '../models/Competition';
import { logger } from '../logger';
import { LinkedEntities } from '../models/views/LinkedEntities';
import { LinkedOrganisations } from '../models/views/LinkedOrganisations';
import { CommunicationTrack } from '../models/CommunicationTrack';
import { getParentEmail, isNotNullAndUndefined } from '../utils/Utils';

@Service()
export default class UserService extends BaseService<User> {
  modelName(): string {
    return User.name;
  }

  public async findByCredentials(email: string, password: string): Promise<User> {
    return this.entityManager
      .createQueryBuilder(User, 'user')
      .andWhere('LOWER(user.email) = :email and user.password = :password', {
        email: email.toLowerCase(),
        password,
      })
      .getOne();
  }

  public async findByEmail(email: string): Promise<User> {
    return this.entityManager
      .createQueryBuilder(User, 'user')
      .andWhere('LOWER(user.email) = :email', { email: email.toLowerCase() })
      .addSelect('user.password')
      .addSelect('user.reset')
      .getOne();
  }

  public async userExist(email: string): Promise<number> {
    return this.entityManager
      .createQueryBuilder(User, 'user')
      .where('LOWER(user.email) = :email', { email: email.toLowerCase() })
      .getCount();
  }

  public async update(email: string, user: User) {
    return this.entityManager
      .createQueryBuilder(User, 'user')
      .update(User)
      .set(user)
      .andWhere('LOWER(user.email) = :email', { email: email.toLowerCase() })
      .execute();
  }

  public async getRole(roleName: string): Promise<any> {
    return this.entityManager
      .createQueryBuilder(Role, 'r')
      .select(['r.id as id', 'r.name as name'])
      .where('r.name = :roleName', { roleName })
      .getRawOne();
  }

  public async getEntityType(entityTypeName: string): Promise<any> {
    return this.entityManager
      .createQueryBuilder(EntityType, 'et')
      .select(['et.id as id', 'et.name as name'])
      .where('et.name = :entityTypeName', { entityTypeName })
      .getRawOne();
  }

  public async getFunction(functionName: string): Promise<Function> {
    return this.entityManager
      .createQueryBuilder(Function, 'fc')
      .select(['fc.id as id', 'fc.name as name'])
      .andWhere('fc.name = :functionName', { functionName })
      .andWhere('fc.isDeleted = 0')
      .getRawOne();
  }

  public async getFunctionRoles(functionId: number): Promise<RoleFunction[]> {
    return this.entityManager
      .createQueryBuilder(RoleFunction, 'rf')
      .where('rf.functionId = :functionId', { functionId })
      .getMany();
  }

  public async deleteRolesByUser(
    userId: number,
    roleId: number,
    inputEntityId: number,
    inputEntityTypeId: number,
    linkedEntityTypeId: number,
  ) {
    try {
      let result = await this.entityManager.query(
        'call ' + 'wsa_users.usp_delete_entity_roles_by_user(?,?,?,?,?)',
        [userId, roleId, inputEntityId, inputEntityTypeId, linkedEntityTypeId],
      );
      return result[0];
    } catch (error) {
      throw error;
    }
  }

  public async getUsersBySecurity(
    userId: number,
    sec: { functionId?: number; roleId?: number },
  ): Promise<User[]> {
    let query = this.entityManager
      .createQueryBuilder(User, 'u')
      .select('u.id as id')
      .innerJoin(UserRoleEntity, 'ure', 'u.id = ure.userId')
      .innerJoin(RoleFunction, 'fr', 'fr.roleId = ure.roleId');

    if (sec.functionId) {
      let id = sec.functionId;
      query.innerJoin(Function, 'f', 'f.id = fr.functionId').andWhere('f.id = :id', { id });
    }

    if (sec.roleId) {
      let id = sec.roleId;
      query.innerJoin(Role, 'r', 'r.id = fr.roleId').andWhere('r.id = :id', { id });
    }

    if (userId) {
      query.andWhere('u.id = :userId', { userId });
    }
    return query.getRawMany();
  }

  public async getOrgUsersBySecurity(
    organisationId: number,
    sec: { functionId?: number; roleId?: number },
    search: string,
    offset: number,
    limit: number,
  ): Promise<any> {
    let query = this.entityManager
      .createQueryBuilder(User, 'u')
      .select([
        'u.id as id',
        'LOWER(u.email) as email',
        'u.firstName as firstName',
        'u.lastName as lastName',
        'u.mobileNumber as mobileNumber',
        'u.genderRefId as genderRefId',
        'u.marketingOptIn as marketingOptIn',
        'u.photoUrl as photoUrl',
        'u.firebaseUID as firebaseUID',
        'u.statusRefId as statusRefId',
      ])
      .addSelect(
        "concat('[', group_concat(distinct JSON_OBJECT('name', c.name)),']') as competitions",
      )
      .addSelect(
        "concat('[', group_concat(distinct JSON_OBJECT('name', lo.linkedOrganisationName)),']') as organisations",
      )
      .innerJoin(UserRoleEntity, 'ure', 'u.id = ure.userId')
      .innerJoin(LinkedCompetitionOrganisation, 'lco', 'lco.id = ure.entityId')
      .innerJoin(Competition, 'c', 'lco.competitionid = c.id')
      .innerJoin(LinkedOrganisations, 'lo', 'lo.linkedOrganisationId = lco.organisationId');

    // if (sec.functionId) {
    // let id = sec.functionId;
    // query.innerJoin(Function, 'f', 'f.id = fr.functionId')
    //     .andWhere('f.id = :id', {id});
    // }

    if (sec.roleId) {
      let id = sec.roleId;
      query.andWhere('ure.roleId = :id', { id });
    }

    let orgEntityId = EntityType.ORGANISATION;
    query
      .andWhere('ure.entityTypeId = :orgEntityId', { orgEntityId })
      .andWhere('lo.inputOrganisationId = :organisationId', { organisationId });

    if (search) {
      query.andWhere(
        new Brackets(qb => {
          qb.andWhere('LOWER(u.firstName) like :query', {
            query: `${search.toLowerCase()}%`,
          }).orWhere('LOWER(u.lastName) like :query', { query: `${search.toLowerCase()}%` });
        }),
      );
    }
    query.groupBy('u.id');

    if (limit) {
      const countObj = await query.getCount();
      const result = await query.skip(offset).take(limit).getRawMany();
      return { countObj, result };
    } else {
      const countObj = null;
      const result = await query.getRawMany();
      return { countObj, result };
    }
  }

  public async findByParam(
    firstName: string,
    lastName: string,
    mobileNumber: string,
    dateOfBirth: Date,
  ): Promise<User[]> {
    let query = this.entityManager
      .createQueryBuilder(User, 'u')
      .select([
        'u.id as id',
        'LOWER(u.email) as email',
        'u.firstName as firstName',
        'u.lastName as lastName',
        'u.mobileNumber as mobileNumber',
        'u.genderRefId as genderRefId',
        'u.marketingOptIn as marketingOptIn',
        'u.photoUrl as photoUrl',
        'u.firebaseUID as firebaseUID',
        'u.statusRefId as statusRefId',
        'u.dateOfBirth as dateOfBirth',
      ])
      .leftJoin(UserRoleEntity, 'ure', 'u.id = ure.userId');

    if (firstName) {
      query.andWhere('u.firstName = :firstName', { firstName });
    }
    if (lastName) {
      query.andWhere('u.lastName = :lastName', { lastName });
    }
    if (mobileNumber) {
      query.andWhere('u.mobileNumber = :mobileNumber', { mobileNumber });
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
    password: string,
  ) {
    let html = ``;
    let subject = 'Invite Mail';
    var passwordTxt = '';
    var appName = 'NetballConnect';
    var googlePlayUrl = 'https://play.google.com/store/apps/details?id=com.wsa.netball&hl=en_AU';
    var appStoreUrl = 'https://itunes.apple.com/au/app/netball-live-scores/id1456225408';
    if (isNotNullAndUndefined(password)) {
      if (toRoleId == Role.UMPIRE || toRoleId == Role.UMPIRE_COACH) {
        passwordTxt = `<p> Your password is <b>${password}</b> - you can change it when you log in if you would like. Please make sure you log in as soon as possible to accept or decline your umpiring duties.`;
      } else {
        passwordTxt = `<p> Your password is <b>${password}</b> - you can change it when you log in if you would like.`;
      }
    }

    if (toRoleId == Role.MANAGER) {
      if (teamData.length == 1) {
        html = `<!DOCTYPE html>
                        <html>
                            <head>
                                <title>Registration Mail</title>
                            </head>
                            <body>
                                <p>Hi ${receiverData.firstName} ${receiverData.lastName},
                                <p> ${userData.firstName} ${userData.lastName} has
                                advised us that you are the manager of team ${teamData[0].name}.
                                As ${competitionData.name} are using Live Scoring
                                for this competition we require you to download the ${appName} App from the
                                <a href='${appStoreUrl}'>App Store</a> or
                                <a href='${googlePlayUrl}'>Google Play</a>
                                and start assigning who  will score your team???s matches. Please note,
                                you can choose to give this responsibility to someone else or score the games yourself.
                                ${passwordTxt}
                                <p> We hope you enjoy using ${appName}.
                                <p> The ${appName} Team
                            </body>
                        </html>`;
      } else if (teamData.length > 1) {
        var teamNames = teamData.map(o => o.name).join(', ');
        html = `<!DOCTYPE html>
                        <html>
                            <head>
                                <title>Registration Mail</title>
                            </head>
                            <body>
                                <p>Hi ${receiverData.firstName} ${receiverData.lastName},
                                <p> ${userData.firstName} ${userData.lastName} has advised
                                us that you are the manager of the following teams:
                                ${teamNames}. As ${competitionData.name} are using Live
                                Scoring for this competition we require you to
                                download the ${appName} App from the
                                <a href='${appStoreUrl}'>App Store</a> or
                                <a href='${googlePlayUrl}'>Google Play</a>
                                and start assigning who  will score your team???s matches. Please note,
                                you can choose to give this responsibility to someone else or score the games yourself.
                                ${passwordTxt}
                                <p> We hope you enjoy using ${appName}.
                                <p> The ${appName} Team
                            </body>
                        </html>`;
      }
    } else if (toRoleId == Role.COACH) {
      if (teamData.length == 1) {
        html = `<!DOCTYPE html>
                        <html>
                            <head>
                                <title>Registration Mail</title>
                            </head>
                            <body>
                                <p>Hi ${receiverData.firstName} ${receiverData.lastName},
                                <p> ${userData.firstName} ${userData.lastName} has advised us
                                that you are the coach of team ${teamData[0].name}. As
                                ${competitionData.name} are using Live Scoring for this competition
                                we require you to download the ${appName} App from the 
                                <a href='${appStoreUrl}'>App Store</a> or
                                <a href='${googlePlayUrl}'>Google Play</a>
                                and start assigning who will score your team???s matches.
                                Please note, you can choose to give this responsibility to someone else or score the games yourself.
                                ${passwordTxt}
                                <p> We hope you enjoy using ${appName}.
                                <p> The ${appName} Team
                            </body>
                        </html>`;
      } else if (teamData.length > 1) {
        var teamNames = teamData.map(o => o.name).join(', ');
        html = `<!DOCTYPE html>
                        <html>
                            <head>
                                <title>Registration Mail</title>
                            </head>
                            <body>
                                <p>Hi ${receiverData.firstName} ${receiverData.lastName},
                                <p> ${userData.firstName} ${userData.lastName} has advised
                                us that you are the coach of the following teams: ${teamNames}.
                                As ${competitionData.name} are using Live Scoring for this
                                competition we require you to download the ${appName} App from the 
                                <a href='${appStoreUrl}'>App Store</a> or
                                <a href='${googlePlayUrl}'>Google Play</a>
                                and start assigning who will score your team???s matches.
                                Please note, you can choose to give this responsibility to someone else or score the games yourself.
                                ${passwordTxt}
                                <p> We hope you enjoy using ${appName}.
                                <p> The ${appName} Team
                            </body>
                        </html>`;
      }
    } else if (toRoleId == Role.UMPIRE) {
      html = `<!DOCTYPE html>
                    <html>
                        <head>
                            <title>Registration Mail</title>
                        </head>
                        <body>
                            <p>Hi ${receiverData.firstName} ${receiverData.lastName},
                            <p>${userData.firstName} ${userData.lastName}, ${competitionData.linkedCompetitionOrganisation.name} has invited you
                            to umpire for ${competitionData.name}. Please Download the ${appName} App from the 
                            <a href='${appStoreUrl}'>App Store</a> or
                            <a href='${googlePlayUrl}'>Google Play</a>
                            and start umpiring.
                            ${passwordTxt}
                            <p> We hope you enjoy using ${appName}.
                            <p> The ${appName} Team
                        </body>
                    </html>`;
    } else if (toRoleId == Role.UMPIRE_COACH) {
      html = `<!DOCTYPE html>
                    <html>
                        <head>
                            <title>Registration Mail</title>
                        </head>
                        <body>
                            <p>Hi ${receiverData.firstName} ${receiverData.lastName},
                            <p>${userData.firstName} ${userData.lastName}, ${competitionData.linkedCompetitionOrganisation.name} has invited you
                            to Umpire Coach for ${competitionData.name}. Please Download the ${appName} App from the 
                            <a href='${appStoreUrl}'>App Store</a> or
                            <a href='${googlePlayUrl}'>Google Play</a>
                            and start Umpire Coaching.
                            ${passwordTxt}
                            <p> We hope you enjoy using ${appName}.
                            <p> The ${appName} Team
                        </body>
                    </html>`;
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
                            Download the ${appName} App from the 
                            <a href='${appStoreUrl}'>App Store</a> or
                            <a href='${googlePlayUrl}'>Google Play</a>
                            and start scoring.
                            ${passwordTxt}
                            <p>We hope you enjoy using ${appName}.
                            <p>The ${appName} Team
                        </body>
                    </html>`;
    }

    const transporter = nodeMailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465, // 465 for secure and 587 for non secure
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.MAIL_USERNAME, // generated ethereal user
        pass: process.env.MAIL_PASSWORD, // generated ethereal password
      },
      tls: {
        // do not fail on invalid certs
        rejectUnauthorized: false,
      },
    });

    const targetEmail =
      receiverData.isInActive == 1 ? getParentEmail(receiverData.email) : receiverData.email;
    const mailOptions = {
      from: {
        name: 'NetballConnect',
        address: 'mail@netballconnect.com',
      },
      to: targetEmail.toLowerCase(),
      replyTo: 'donotreply@worldsportaction.com',
      subject: subject,
      html: html,
    };

    if (Number(process.env.SOURCE_MAIL) == 1) {
      mailOptions.html = ' To: ' + mailOptions.to + '<br><br>' + mailOptions.html;
      mailOptions.to = process.env.TEMP_DEV_EMAIL;
    }
    logger.info(`UserService - sendMail : mailOptions ${mailOptions}`);

    let cTrack = new CommunicationTrack();
    try {
      cTrack.id = 0;
      cTrack.communicationType = 11;
      //cTrack.contactNumber = receiverData.mobileNumber
      cTrack.entityId = toRoleId;
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
          html = html.replace(password, '******');
          cTrack.content = html;
          this.insertIntoCommunicationTrack(cTrack);
          // Here i commented the below code as the caller is not handling the promise reject
          // return Promise.reject(err);
        } else {
          cTrack.statusRefId = 1;
          logger.info('UserService - sendMail : Mail sent successfully');
          html = html.replace(password, '******');
          cTrack.content = html;
          this.insertIntoCommunicationTrack(cTrack);
        }
        transporter.close();
        return Promise.resolve();
      });
    } catch (error) {
      // cTrack.statusRefId = 2;
    }
  }

  public async getUsersByOptions(
    entityTypeId: number,
    entityIdList: number[],
    userName: string,
    sec: { functionId?: number; roleId?: number },
  ): Promise<User[]> {
    let query = this.entityManager
      .createQueryBuilder(User, 'u')
      .select([
        'u.id as id',
        'LOWER(u.email) as email',
        'u.firstName as firstName',
        'u.lastName as lastName',
        'u.mobileNumber as mobileNumber',
        'u.genderRefId as genderRefId',
        'u.marketingOptIn as marketingOptIn',
        'u.photoUrl as photoUrl',
        'u.firebaseUID as firebaseUID',
      ])
      .addSelect(
        "concat('[', group_concat(distinct JSON_OBJECT('entityTypeId', " +
          "le.linkedEntityTypeId, 'entityId', le.linkedEntityId, 'name', le.linkedEntityName)),']') " +
          'as linkedEntity',
      )
      .innerJoin(UserRoleEntity, 'ure', 'u.id = ure.userId')
      .innerJoin(RoleFunction, 'fr', 'fr.roleId = ure.roleId')
      .innerJoin(
        LinkedEntities,
        'le',
        'le.linkedEntityTypeId = ure.entityTypeId AND le.linkedEntityId = ure.entityId',
      );

    if (sec.functionId) {
      let id = sec.functionId;
      query.innerJoin(Function, 'f', 'f.id = fr.functionId').andWhere('f.id = :id', { id });
    }

    if (sec.roleId) {
      let id = sec.roleId;
      query.innerJoin(Role, 'r', 'r.id = fr.roleId').andWhere('r.id = :id', { id });
    }

    query
      .andWhere('le.inputEntityTypeId = :entityTypeId', { entityTypeId })
      .andWhere('le.inputEntityId in (:entityIdList)', { entityIdList: entityIdList });

    if (userName) {
      query.andWhere(
        new Brackets(qb => {
          qb.andWhere('LOWER(u.firstName) like :query', {
            query: `${userName.toLowerCase()}%`,
          }).orWhere('LOWER(u.lastName) like :query', { query: `${userName.toLowerCase()}%` });
        }),
      );
    }
    query.groupBy('u.id');
    return query.getRawMany();
  }

  public async getUserIdBySecurity(
    entityTypeId: number,
    entityIdList: [number],
    userName: string,
    sec: { functionId?: number; roleId?: number },
  ): Promise<User[]> {
    let query = this.entityManager
      .createQueryBuilder(User, 'u')
      .select(['u.id'])
      .innerJoin(UserRoleEntity, 'ure', 'u.id = ure.userId')
      .innerJoin(RoleFunction, 'fr', 'fr.roleId = ure.roleId')
      .innerJoin(
        LinkedEntities,
        'le',
        'le.linkedEntityTypeId = ure.entityTypeId AND le.linkedEntityId = ure.entityId',
      );

    if (sec.functionId) {
      let id = sec.functionId;
      query.innerJoin(Function, 'f', 'f.id = fr.functionId').andWhere('f.id = :id', { id });
    }

    if (sec.roleId) {
      let id = sec.roleId;
      query.innerJoin(Role, 'r', 'r.id = fr.roleId').andWhere('r.id = :id', { id });
    }

    query
      .andWhere('le.inputEntityTypeId = :entityTypeId', { entityTypeId })
      .andWhere('le.inputEntityId in (:entityIdList)', { entityIdList: entityIdList });

    if (userName) {
      query.andWhere(
        '(LOWER(u.firstName) like :query or ' +
          'LOWER(u.lastName) like :query or ' +
          "LOWER(CONCAT_WS(' ', u.firstName, u.lastName)) like :query)",
        {
          query: `${userName.toLowerCase()}%`,
        },
      );
    }

    return query.getMany();
  }

  public async findUserFullDetailsById(id: number): Promise<User> {
    return await this.entityManager.query('select * from wsa_users.user user where user.id = ?;', [
      id,
    ]);
  }

  public async insertIntoCommunicationTrack(ctrack: CommunicationTrack) {
    await this.entityManager.query(
      `insert into wsa_common.communicationTrack(id, emailId,content,subject,contactNumber,userId,entityId,communicationType,statusRefId,deliveryChannelRefId,createdBy) values(?,?,?,?,?,?,?,?,?,?,?)`,
      [
        ctrack.id,
        ctrack.emailId,
        ctrack.content,
        ctrack.subject,
        ctrack.contactNumber,
        ctrack.userId,
        ctrack.entityId,
        ctrack.communicationType,
        ctrack.statusRefId,
        ctrack.deliveryChannelRefId,
        ctrack.createdBy,
      ],
    );
  }

  async findByRoles(roles: number[], entityType: number, entityId: number): Promise<User[]>;
  async findByRoles(role: number, entityType: number, entityId: number): Promise<User[]>;
  async findByRoles(
    roles: number | number[],
    entityType: number,
    entityId: number,
  ): Promise<User[]> {
    if (!Array.isArray(roles)) {
      roles = [roles];
    }

    return this.entityManager
      .createQueryBuilder(User, 'u')
      .innerJoin(
        'u.userRoleEntities',
        'ure',
        'ure.entityTypeId=:entityType AND ure.entityId=:entityId AND roleId IN (:roles)',
        {
          entityType: entityType,
          entityId: entityId,
          roles: roles,
        },
      )
      .getMany();
  }

  async isCompetitionOrganisationUmpire(
    competitionOrganisationId: number,
    userId: number,
  ): Promise<boolean> {
    const competitionUmpires = await this.findByRoles([15, 20], 6, competitionOrganisationId);
    return competitionUmpires.filter(umpire => userId === umpire.id).length > 0;
  }

  public async updateMatchUmpirePaymentStatus(
    matchUmpireId: number,
    status: 'paid' | 'approved',
    approvedBy: number = undefined,
  ): Promise<any> {
    try {
      if (status === 'approved') {
        const currentTime = new Date();
        await this.entityManager.query(
          `update wsa.matchUmpire set paymentStatus = ?, approved_at = ?, 
                approvedByUserId = ? where id = ?`,
          [status, currentTime, approvedBy, matchUmpireId],
        );
      } else {
        await this.entityManager.query(
          `update wsa.matchUmpire set paymentStatus = ? where id = ?`,
          [status, matchUmpireId],
        );
      }
    } catch (error) {
      throw error;
    }
  }

  public async findUserRoles(options): Promise<any> {
    const { userId, entityId, entityTypeId, roleId } = options;
    try {
      const userRoleQuery = this.entityManager
        .createQueryBuilder(UserRoleEntity, 'ure')
        .where('ure.userId = :userId', { userId })
        .andWhere('ure.isDeleted = 0');

      if (entityId) {
        userRoleQuery.andWhere('ure.entityId = :entityId', { entityId });
      }

      if (entityTypeId) {
        userRoleQuery.andWhere('ure.entityTypeId = :entityTypeId', { entityTypeId });
      }

      if (roleId) {
        userRoleQuery.andWhere('ure.roleId = :roleId', { roleId });
      }

      return await userRoleQuery.getMany();
    } catch (error) {
      throw error;
    }
  }
}
