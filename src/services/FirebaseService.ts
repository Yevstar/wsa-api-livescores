import { Service } from "typedi";
import * as admin from "firebase-admin";
import { logger } from "../logger";
import { chunk, isArrayPopulated } from "../utils/Utils";
import { firestore } from "firebase-admin";
import UserRecord = admin.auth.UserRecord;
import { User } from "../models/User";

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
        const bucket = await this.getFirebaseStorageBucket();

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
                                    logger.error(`Failed upload file` + error);
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

    public async sendMessageChunked({ tokens, title = undefined, body = undefined, data = undefined }) {
        let chunked = chunk(tokens, 99);
        logger.debug('Chunked token list', chunked);
        for (const part of chunked) {
            this.sendMessage({ tokens: part, title: title, body: body, data: data });
        }
    }

    public async sendMessage({ tokens, title = undefined, body = undefined, data = undefined }) {
        let message = {
            tokens: tokens
        };
        message['android'] = { priority: 'high' };
        if (title || body) message['notification'] = { title: title, body: body };
        logger.debug('Sending data', data);
        if (data) message['data'] = data.hasOwnProperty('data') ? data['data'] : data;
        logger.debug('Send multicast message', message);
        admin.messaging().sendMulticast(message)
            .then((response) => {
                logger.debug('Sent result', JSON.stringify(response));
                return { success: true, response: response };
            })
            .catch((error) => {
                logger.error('Failed result', JSON.stringify(error));
                return { success: false, response: error };
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
                return { success: true, response: response };
            })
            .catch((error) => {
                logger.error('Error send message to all:', error);
                return { success: false, response: error };
            });
    }

    public async subscribeTopic(token: string | string[], topics: string[]) {
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

    public async unsubscribeTopic(token: string | string[], topics: string[]) {
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
            email: email.toLowerCase(),
            emailVerified: true,
            password: password
        })
            .then(function (userRecord) {
                logger.debug('Successfully created new user:', userRecord.toJSON());
                return userRecord;
            })
            .catch(function (error) {
                logger.error('Error creating new user:', error);
                return undefined;
            });
    }

    public async loadUserByUID(uid: string): Promise<UserRecord> {
        return admin.auth().getUser(uid)
            .then(function (userRecord) {
                logger.debug(`Successfully load user by uid ${uid}:`, userRecord.toJSON());
                return userRecord;
            })
            .catch(function (error) {
                logger.error(`Error load user by uid ${uid}:` + error);
                return undefined;
            });
    }

    public async loadUserByEmail(email: string): Promise<UserRecord> {
        return admin.auth().getUserByEmail(email.toLowerCase())
            .then(function (userRecord) {
                logger.debug(`Successfully load user by email ${email}:`, userRecord.toJSON());
                return userRecord;
            })
            .catch(function (error) {
                logger.error('Error load user by email ${email}:', error);
                return undefined;
            });
    }

    public async updateUserByUID(uid: string, email: string, password: string): Promise<UserRecord> {
        return admin.auth().updateUser(uid, {
            email: email.toLowerCase(),
            emailVerified: true,
            password: password
        })
            .then(function (userRecord) {
                logger.debug('Successfully update user:', userRecord.toJSON());
                return userRecord;
            })
            .catch(function (error) {
                logger.error('Error user user:', error);
                return undefined;
            });
    }

    public async removeMedia(filePath: string): Promise<any> {
        const bucket = await this.getFirebaseStorageBucket();

        const deleteFile = async (): Promise<any> =>
            new Promise<any>((resolve, reject): void => {
                bucket.file(filePath).exists()
                    .then((info) => {
                        bucket.file(filePath).delete();
                        resolve({ success: true });
                    })
                    .catch((error) => {
                        reject(error);
                    });
            });

        return deleteFile();
    }

    private async getFirebaseStorageBucket() {
        var fbStorageBuck = JSON.parse(process.env.firebaseConfig)
        return admin.storage().bucket("world-sport-action-dev-c1019.appspot.com");
    }

    public async getFileNameFromUrl(url: string, prefix: string): Promise<string> {
        try {
            const bucket = await this.getFirebaseStorageBucket();

            let fileName = url.split(`https://www.googleapis.com/download/storage/v1/b/${bucket.name}/o/media%2F${prefix}`)[1];
            fileName = fileName.split(fileName.substring(fileName.lastIndexOf('?generation')))[0];
            console.log(`https://www.googleapis.com/download/storage/v1/b/${bucket.name}/o/${prefix}`)
            fileName = fileName.split(fileName.substring(fileName.lastIndexOf('?generation')))[0];
            const directory = `media/${prefix}`;
            fileName = directory.concat(fileName);
            return fileName;
        } catch (err) {
            throw err;
        }
    }

    /// --- Team Chat ---
    public async removeUserFromTeamChat(teamId: number, user: User) {
        if (teamId && user) {
            let db = admin.firestore();
            let chatsCollectionRef = await db.collection('chats');
            /// --- Team chat ---
            let queryRef = chatsCollectionRef.where('teamId', '==', teamId);
            let querySnapshot = await queryRef.get();

            if (!querySnapshot.empty) {
                let userQueryRef = queryRef.where('uids', 'array-contains', user.firebaseUID);
                let userQuerySnapshot = await userQueryRef.get();
                if (!userQuerySnapshot.empty) {
                    let teamChatDoc = chatsCollectionRef.doc(`team${teamId.toString()}chat`);
                    teamChatDoc.update({
                        'uids': admin.firestore.FieldValue.arrayRemove(user.firebaseUID),
                        'updated_at': admin.firestore.FieldValue.serverTimestamp()
                    });
                }
                let removedUserQueryRef = queryRef.where('removed_uids', 'array-contains', user.firebaseUID);
                let removedUserQuerySnapshot = await removedUserQueryRef.get();
                if (removedUserQuerySnapshot.empty) {
                    let teamChatDoc = chatsCollectionRef.doc(`team${teamId.toString()}chat`);
                    teamChatDoc.update({
                        'removed_uids': admin.firestore.FieldValue.arrayUnion(user.firebaseUID),
                        'updated_at': admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        }
    }

    /// --- One to One Chat ---
    public async removeUserForOneToOne(removingUser: User, targetUsersList: User[]) {
        if (removingUser && targetUsersList && targetUsersList.length > 0) {
            let db = admin.firestore();
            let chatsCollectionRef = await db.collection('chats');
            let queryRef = chatsCollectionRef.where('type', '==', 'private');
            let userQueryRef = queryRef.where('uids', 'array-contains', removingUser.firebaseUID);
            let querySnapshot = await userQueryRef.get();

            if (!querySnapshot.empty) {
                for (let targetUser of targetUsersList) {
                    let targetUserQueryRef = queryRef.where('uids', 'array-contains', targetUser.firebaseUID);
                    let targetUserQuerySnapshot = await targetUserQueryRef.get();
                    if (!targetUserQuerySnapshot.empty) {
                        targetUserQuerySnapshot.forEach(qs => {
                            let targetChatDoc = chatsCollectionRef.doc(qs.id);
                            targetChatDoc.update({
                                'deleted_at': admin.firestore.FieldValue.serverTimestamp()
                            });
                        });
                    }
                }
            }
        }
    }

    /// --- Group Chat ---
    public async removeUserForGroupChat(removingUser: User) {
        if (removingUser) {
            let db = admin.firestore();
            let chatsCollectionRef = await db.collection('chats');
            let queryRef = chatsCollectionRef.where('type', '==', 'group');
            let userQueryRef = queryRef.where('uids', 'array-contains', removingUser.firebaseUID);
            let querySnapshot = await userQueryRef.get();

            if (!querySnapshot.empty) {
                querySnapshot.forEach(qs => {
                    const docData = qs.data();
                    let targetChatDoc = chatsCollectionRef.doc(qs.id);
                    if (docData['uids'].length == 2) {
                        targetChatDoc.update({
                            'deleted_at': admin.firestore.FieldValue.serverTimestamp(),
                            'updated_at': admin.firestore.FieldValue.serverTimestamp()
                        });
                    } else {
                        targetChatDoc.update({
                            'uids': admin.firestore.FieldValue.arrayRemove(removingUser.firebaseUID),
                            'removed_uids': admin.firestore.FieldValue.arrayUnion(removingUser.firebaseUID),
                            'updated_at': admin.firestore.FieldValue.serverTimestamp()
                        });
                    }
                });
            }
        }
    }

    /// --- FirebaseUID update
    public async updateFirebaseUIDOfExistingChats(from: string, to: string) {
        if (from && to) {
            var updatingChatDocumentIds: string[] = [];

            let db = admin.firestore();
            let chatsCollectionRef = await db.collection('chats');

            /// Updating Chat -> Document -> uids field
            var userQueryRef = chatsCollectionRef.where('uids', 'array-contains', from);
            var querySnapshot = await userQueryRef.get();
            if (!querySnapshot.empty) {
                querySnapshot.forEach(qs => {
                    updatingChatDocumentIds.push(qs.id);
                    let targetChatDoc = chatsCollectionRef.doc(qs.id);
                    targetChatDoc.update({
                        'uids': admin.firestore.FieldValue.arrayRemove(from),
                    });
                    targetChatDoc.update({
                        'uids': admin.firestore.FieldValue.arrayUnion(to),
                        'updated_at': admin.firestore.FieldValue.serverTimestamp()
                    });
                });
            }

            /// Updating Chat -> Document -> removed_uids field
            userQueryRef = chatsCollectionRef.where('removed_uids', 'array-contains', from);
            querySnapshot = await userQueryRef.get();
            if (!querySnapshot.empty) {
                querySnapshot.forEach(qs => {
                    updatingChatDocumentIds.push(qs.id);
                    let targetChatDoc = chatsCollectionRef.doc(qs.id);
                    targetChatDoc.update({
                        'removed_uids': admin.firestore.FieldValue.arrayRemove(from),
                    });
                    targetChatDoc.update({
                        'removed_uids': admin.firestore.FieldValue.arrayUnion(to),
                        'updated_at': admin.firestore.FieldValue.serverTimestamp()
                    });
                });
            }

            let uniqueChatIds = [...new Set(updatingChatDocumentIds)];
            if (isArrayPopulated(uniqueChatIds)) {
                for (let chatId of uniqueChatIds) {
                    /// Updating Chat -> Document -> messages Collection
                    /// -> Document's -> senderId field
                    let messagesCollectionRef = await db.collection('chats/' + chatId + '/messages');
                    let messagesQueryRef = messagesCollectionRef.where('senderId', '==', from);
                    let messagesQuerySnapshot = await messagesQueryRef.get();
                    if (!messagesQuerySnapshot.empty) {
                        messagesQuerySnapshot.forEach(mqs => {
                            let targetMessagesDoc = messagesCollectionRef.doc(mqs.id);
                            targetMessagesDoc.set({
                                'senderId': to
                            });
                        });
                    }
                }
            }
        }
    }
}
