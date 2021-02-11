import { Container } from "typedi";
import { Connection, createConnections, DefaultNamingStrategy, useContainer } from "typeorm-plus";
import { snakeCase } from 'typeorm-plus/util/StringUtils';

let connection: Connection[];

async function currentConnection(): Promise<Connection[]> {
    if (!connection) {
        await connect();
    }
    return connection;
}

async function connect(): Promise<Connection[]> {

    const usersDatabase = Object.assign({
        // name: "userDB",
        type: "mysql",
        name: process.env.MYSQL_DATABASE_USERS,
        database: process.env.MYSQL_DATABASE_USERS,
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT,
        username: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        entities: [
            __dirname + "/models/*",
            __dirname + "/models/security/*",
            __dirname + "/models/views/*"
        ],
        namingStrategy: new NamingStrategy(),
        // logger: "file"
    });

    const wsaDatabase = Object.assign({
        name: "default",
        type: "mysql",
        database: process.env.MYSQL_DATABASE,
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT,
        username: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        entities: [
            __dirname + "/models/*",
            __dirname + "/models/security/*",
            __dirname + "/models/views/*"
        ],
        namingStrategy: new NamingStrategy(),
        // logger: "file"
    });

    const ALL_DATABASES = [wsaDatabase, usersDatabase];

    useContainer(Container)
    connection = await createConnections(ALL_DATABASES);

    return connection;
}

class NamingStrategy extends DefaultNamingStrategy {
    columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
        if (embeddedPrefixes.length) {
            return snakeCase(embeddedPrefixes.join("_")) + (customName ? snakeCase(customName) : snakeCase(propertyName));
        }
        return customName ? customName : propertyName;
    }
}

export {
    connect,
    currentConnection
};
