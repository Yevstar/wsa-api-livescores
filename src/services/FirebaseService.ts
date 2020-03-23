import {Service} from "typedi";
import {firebaseConfig} from "../integration/firebase.config";
import * as admin from "firebase-admin";
import {logger} from "../logger";
import {chunk} from "../utils/Utils";
import {firestore} from "firebase-admin";
import UserRecord = admin.auth.UserRecord;

@Service()
export default class FirebaseService {

    private static instance: FirebaseService;

    public static Instance(): FirebaseService {
        if (this.instance == null) {
            this.instance = new FirebaseService();
        }
        return this.instance;
    }

    public async upload(filePath: string, file: Express.Multer.File, isPublic: boolean = false): Promise<any> {
        const bucket = admin.storage().bucket(firebaseConfig.storageBucket);

        const uploadToStorage = async (fileContent: any, filePath: string, mimetype: string): Promise<any> =>
            new Promise<any>((resolve, reject): void => {
                const fileUpload = bucket.file(filePath);
                const blobStream = fileUpload.createWriteStream({
                    metadata: {
                        contentType: mimetype,
                        cacheControl: `public, max-age=${60 * 60 * 24 * 365}`
                    },
                    public: isPublic,
                    private: !isPublic
                });
                blobStream.on('error', (error) => {
                    reject(error);
                });
                blobStream.on('finish', async () => {
                    // let filename = filePath.replace(/\/([^\/]*)$/, '%2F$1');
                    // resolve(`https://firebasestorage.googleapis.com/v0/b/world-sport-action.appspot.com/o${filename}?alt=media`);
                    resolve((await fileUpload.getMetadata())[0].mediaLink)
                });
                blobStream.end(fileContent);
            });


        const uploadFileAndGetURL = async (): Promise<any> =>
            new Promise<any>((resolve, reject): void => {
                bucket.file(filePath).exists()
                    .then((info) => {
                        if (info[0]) {
                            const url = `https://storage.googleapis.com/${bucket.name}${filePath}`;
                            logger.debug('Already Uploaded File : ', url);
                            resolve({ filePath, url });
                        } else {
                            const fileContent = file.buffer;
                            uploadToStorage(fileContent, filePath, file.mimetype)
                                .then((url) => {
                                    logger.debug('Newly Uploaded File : ', url);
                                    resolve({ filePath, url });
                                })
                                .catch((error) => {
                                    logger.error(`Failed upload file`, error);
                                    reject(error);
                                });
                        }
                    })
                    .catch((error) => {
                        reject(error);
                    });
            });

        return uploadFileAndGetURL()
    }

    public async sendMessageChunked({tokens, title = undefined, body = undefined, data = undefined}) {
        let chunked = chunk(tokens, 99);
        logger.debug('Chunked token list', chunked);
        for (const part of chunked) {
            this.sendMessage({tokens: part, title: title, body: body, data: data});
        }
    }

    public async sendMessage({tokens, title = undefined, body = undefined, data = undefined}) {
        let message = {
            tokens: tokens
        };
        message['android'] = {priority: 'high'};
        if (title || body) message['notification'] = {title: title, body: body};
        logger.debug('Sending data', data);
        if (data) message['data'] = data.hasOwnProperty('data') ? data['data'] : data;
        logger.debug('Send multicast message', message);
        admin.messaging().sendMulticast(message)
            .then((response) => {
                logger.debug('Sent result', JSON.stringify(response));
                return {success: true, response: response};
            })
            .catch((error) => {
                logger.error('Failed result', JSON.stringify(error));
                return {success: false, response: error};
            });
    }

    // public async sendMatchUpdate({match, title = undefined, body = undefined, data = undefined}) {
    //     let message = {
    //         condition: `'score_team_${match.team1Id}' in topics || 'score_team_${match.team2Id}' in topics`
    //     };
    //     message['android'] = {priority: 'high'};
    //     if (title || body) message['notification'] = {title: title, body: body};
    //     if (data) message['data'] = data.hasOwnProperty('data') ? data['data'] : data;
    //     logger.info('Send topic message', message);
    //     admin.messaging().send(message)
    //         .then((response) => {
    //             logger.info('Success sent message', response);
    //             return {success: true, response: response};
    //         })
    //         .catch((error) => {
    //             logger.error('Failed sent message', error);
    //             return {success: false, response: error};
    //         });
    // }

    public async sendToAll(message) {
        admin.messaging().sendAll(message)
            .then((response) => {
                return {success: true, response: response};
            })
            .catch((error) => {
                logger.error('Error send message to all:', error);
                return {success: false, response: error};
            });
    }

    public async subscribeTopic(token, topics: string[]) {
        for (const topic of topics) {
            admin.messaging().subscribeToTopic(token, topic)
                .then(function (response) {
                    logger.debug('Successfully subscribed to topic:', response);
                })
                .catch(function (error) {
                    logger.error('Error subscribing to topic:', error);
                });
        }
    }

    public async unsubscribeTopic(token, topics: string[]) {
        for (const topic of topics) {
            admin.messaging().unsubscribeFromTopic(token, topic)
                .then(function (response) {
                    logger.debug('Successfully unsubscribed from topic:', response);
                })
                .catch(function (error) {
                    logger.error('Error unsubscribed from topic:', error);
                });
        }
    }

    public async createUser(email: string, password: string): Promise<UserRecord> {
        return admin.auth().createUser({
            email: email,
            emailVerified: true,
            password: password
        })
            .then(function(userRecord) {
                logger.debug('Successfully created new user:', userRecord.toJSON());
                return userRecord;
            })
            .catch(function(error) {
                logger.error('Error creating new user:', error);
                return undefined;
            });
    }

    public async loadUserByUID(uid: string): Promise<UserRecord> {
        return admin.auth().getUser(uid)
            .then(function(userRecord) {
                logger.debug(`Successfully load user by uid ${uid}:`, userRecord.toJSON());
                return userRecord;
            })
            .catch(function(error) {
                logger.error(`Error load user by uid ${uid}:`, error);
                return undefined;
            });
    }

    public async loadUserByEmail(email: string): Promise<UserRecord> {
        return admin.auth().getUserByEmail(email)
            .then(function(userRecord) {
                logger.debug(`Successfully load user by email ${email}:`, userRecord.toJSON());
                return userRecord;
            })
            .catch(function(error) {
                logger.error('Error load user by email ${email}:', error);
                return undefined;
            });
    }

    public async updateUserByUID(uid: string, email: string, password: string): Promise<UserRecord> {
        return admin.auth().updateUser(uid,{
            email: email,
            emailVerified: true,
            password: password
        })
            .then(function(userRecord) {
                logger.debug('Successfully update user:', userRecord.toJSON());
                return userRecord;
            })
            .catch(function(error) {
                logger.error('Error user user:', error);
                return undefined;
            });
    }
}

