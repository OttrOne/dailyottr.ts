import { Client, Guild, MessageEmbed, User } from 'discord.js';
import Parser from 'rss-parser';

import dailyOtterModel from '../schemas/dailyotter-schema';
import { Otter } from '../interfaces/Otter';
import configModel from '../schemas/doconf-schema';
import logger from '../core/logger';
import { Task, addTask } from '../core/scheduler';

const parser = new Parser();

/**
 * DailyOtter
 * @version 1.2
 */

/**
 * Fetch Otters from the daily otter blog.
 * @param {boolean} save the results to database
 * @param {number} limit the results
 * @param {boolean} shuffle the results
 * @returns Promise with an Otter Array
 */
const fetchOtters = async (save: boolean = true, limit: number = -1, shuffle: boolean = false): Promise<Array<Otter>> => {

    logger.info(`[DailyOtterMod] Fetch otters, saving: ${save}`);

    // parse dailyotter blog for pictures
    const feed = await parser.parseURL('https://dailyotter.org/?format=rss');
    const picRe = /data-image="([a-zA-Z0-9:.%\-+/]+)"/;

    if (shuffle) feed.items.sort(() => Math.random() - 0.5);
    const ottersItems = limit > 0 ? feed.items.slice(feed.items.length - limit) : feed.items;
    const otters = [];

    for (const item of ottersItems) {

        if (!item.content) return [];
        // check for url in content
        const url = picRe.exec(item.content);
        if (url && url[1]) {

            if (save) {
                // check if existant.
                const exists = await dailyOtterModel.find({
                    guid: item.guid,
                });
                // TODO findOneAndUpdate?
                if (exists.length !== 0) continue;
            }
            const otter: Otter = {
                title: item.title || '',
                date: item.isoDate || '',
                reference: item.contentSnippet || '',
                link: item.link || '',
                imageUrl: url[1],
            };
            if (save) {
                new dailyOtterModel({
                    guid: item.guid,
                    title: item.title,
                    date: item.isoDate,
                    reference: item.contentSnippet,
                    link: item.link,
                    imageUrl: url[1],
                }).save(function(err: any, doc: any) {
                    if (err) {
                        logger.error(err);
                        logger.debug(doc);
                    }
                });
            }
            // push to list of new otts
            otters.push(otter);
        }
    }
    // pics from rss are ordered chronologically with newest, first.
    // we want to send it so that the newest one is the last message
    return otters.reverse();
};

const fetchLocalOtters = async (limit: number = 1): Promise<Array<Otter>> => {


    return (
        await dailyOtterModel.aggregate(undefined, undefined).sample(limit < 1 || limit > 10 ? 1 : limit)
    ) as Array<Otter>;
};

const sendOtter = async (guild: Guild, otters: Array<Otter>) => {

    if (!guild.me) return;
    const me = guild.me.user;

    try {
        // get channel from mongodb
        const confChannel = await configModel.findOne({ _id: guild.id });
        if (!confChannel) return;
        const channel = guild.channels.cache.get(confChannel.channelId);
        if (!channel) throw Error(`[DailyOtterMod] Channel not found on guild ${guild.name}`);

        for (const otter of otters) {
            const otterEmbed = generateEmbed(me, otter);
            try {
                if (channel.isText()) {
                    await channel.send({ embeds: [otterEmbed] });
                    logger.debug(`[DailyOtterMod] Sent Ott to Server ${guild.name}`);
                }
            }
            catch (error) {
                logger.error(`[DailyOtterMod] Unable to send Messages in the configured channel on Server ${guild.name}`);
                logger.error(error);
            }
        }

    }
    catch (err) {
        logger.error(err);
        return;
    }
};

/**
 *
 * @param {User} me
 * @param {Otter} otter
 * @returns MessageEmbed
 */
const generateEmbed = (me: User, otter: Otter) => {

    return new MessageEmbed()
        .setAuthor(me.username, me.avatarURL() || undefined)
        .setTitle(otter.title)
        .setImage(otter.imageUrl)
        .setTimestamp(new Date(otter.date))
        .setColor('#F2B749')
        .setURL(otter.link)
        .setFooter(`Fetched from dailyotter.org - ${otter.reference}`);
};

/**
 * Send a requested amount of otts to a server.
 * @param {Guild} guild the current guild operating in
 * @param {number} limit the amount of pictures sent
 */
const sendLast = async (guild: Guild, limit: number) => {

    // parse dailyotter blog for pictures

    const otters = await fetchLocalOtters(limit);
    await sendOtter(guild, otters);
};

export default async (client: Client) => {

    // first execution on startup
    const otters = await fetchOtters();
    logger.debug(`[DailyOtterMod] Found ${otters.length} new Otters !`);
    client.guilds.cache.forEach((guild) => {
        sendOtter(guild, otters);
    });

    const updateOtters = new Task('updateOtters', async (context: any) => {

        const clnt = context[0];

        const otts = await fetchOtters();
        logger.debug(`[DailyOtterMod] Found ${otts.length} new Otters !`);
        clnt.guilds.cache.forEach((guild: Guild) => {
            sendOtter(guild, otts);
        });
    }, 3 * 60 * 60 * 1000, undefined, client);
    addTask(updateOtters);
    logger.info('[DailyOtterMod] Add Task to update otters');
};

export { sendLast };
