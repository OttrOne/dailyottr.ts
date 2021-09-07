import { Client, Intents } from 'discord.js';
import { VERSION } from './version';
import { Kevin } from './core/kevin';
import { ModLoader } from './core/modloader';
import scheduler from './core/scheduler';
import logger from './core/logger';
import mongo from './core/mongo';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
    ],
});

client.on('ready', async () => {
    if (!client.user) return;

    logger.info(`LexBot v${VERSION} logged in as ${client.user.tag}!`);
    new Kevin(client, 'do!');
    new ModLoader(client);

    scheduler();
    await mongo().then(() => {
        console.log('\x1b[32m%s\x1b[0m', 'Successfully connected to mongodb');
    }).catch((e) => {
        logger.error(e);
    });
});


client.login(process.env.TOKEN);
