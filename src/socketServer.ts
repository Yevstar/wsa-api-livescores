import * as WebSocket from 'ws';
import * as http from "http";
import * as https from "https";
import {logger} from './logger';
import {Match} from './models/Match';

interface SubscribeMessage extends SocketMessage {
    matchId: number;
}

interface SocketMessage {
    type: 'subscribe' | 'test',
}

interface ExtWebSocket extends WebSocket {
    isAlive: boolean;
    subscriptionMatchIds: number[];
}

let socketServer: WebSocket.Server;

function startSocketServer(server: http.Server | https.Server): WebSocket.Server {

    // Attach a socket server to the supplied http server.
    socketServer = new WebSocket.Server({server});

    // Listen for connections.
    socketServer.on('connection', onConnection);

    // Check for dead connections.
    setInterval(() => {
        socketServer.clients.forEach((ws: ExtWebSocket) => {

            if (!ws.isAlive) {
                return ws.terminate();
            }

            ws.isAlive = false;
            ws.isAlive = false;
            ws.ping();
        });
    }, 10000);

    return socketServer;
}

function onConnection(ws: ExtWebSocket) {

    // Setup socket attributes.
    ws.isAlive = true;
    ws.subscriptionMatchIds = [];

    // On ping, set the socket to alive.
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    // Process messages.
    ws.on('message', async (message: string) => {
        try {
            const result = await processMessage(ws, JSON.parse(message));
            ws.send(result);
        } catch (err) {
            logger.error(`Failed to process message from socket`, err);
        }
    });

    // Send a welcome message.
    ws.send(status(ws));
}

function processMessage(ws: ExtWebSocket, socketMessage: SocketMessage): string {
    if (socketMessage.type === 'subscribe') {
        return onSubscribe(ws, socketMessage as SubscribeMessage);
    }
}

function onSubscribe(ws: ExtWebSocket, subscribeMessage: SubscribeMessage): string {

    // Add the subscription if one doesn't already exist.
    if (ws.subscriptionMatchIds.indexOf(subscribeMessage.matchId) === -1) {
        ws.subscriptionMatchIds.push(subscribeMessage.matchId);
    }
    return status(ws);
}

function status(ws: ExtWebSocket): string {
    return JSON.stringify({
        subscriptionMatchIds: ws.subscriptionMatchIds,
        version: "1.0",
    });
}

function sendMatchUpdate(match: Match): void {
    socketServer.clients.forEach((ws: ExtWebSocket) => {

        // If the socket is subscribed to the match.
        if (ws.subscriptionMatchIds.indexOf(match.id) !== -1) {
            ws.send(JSON.stringify(match));
        }
    });
}

export {
    startSocketServer,
    sendMatchUpdate
};
