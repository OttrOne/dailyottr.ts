import { Client, Guild, MessageEmbed, User } from 'discord.js';
import Parser from 'rss-parser';

import dailyOtterModel from '../schemas/dailyotter-schema';
import { Otter } from '../interfaces/otter';
import configModel from '../schemas/doconf-schema';
import { info, error as _error, debug } from '../core/logger';
import { Task, addTask } from '../core/scheduler';

const parser = new Parser();

const fetchOtters = async (save = true, limit = -1, shuffle = false): Promise<Array<Otter>> => {

    info(`[DailyOtterMod] Fetch otters, saving: ${save}`);

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
                }).save(function(err: any, doc: any) {
                    if (err) {
                        _error(err);
                        console.log(doc);
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
                    debug(`[DailyOtterMod] Sent Ott to Server ${guild.name}`);
                }
            }
            catch (error) {
                _error(`[DailyOtterMod] Unable to send Messages in the configured channel on Server ${guild.name}`);
                console.log(error);
            }
        }

    }
    catch (err) {
        console.log(err);
        // _error(err);
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

const sendLast = async (guild: Guild, limit: number) => {

    // parse dailyotter blog for pictures

    const otters = await fetchOtters(false, limit, true);
    await sendOtter(guild, otters);
};

export default async (client: Client) => {

    // first execution on startup
    const otters = await fetchOtters();
    debug(`[DailyOtterMod] Found ${otters.length} new Otters !`);
    client.guilds.cache.forEach((guild) => {
        sendOtter(guild, otters);
    });

    const updateOtters = new Task('updateOtters', async (context: any) => {

        const clnt = context[0];

        const otts = await fetchOtters();
        debug(`[DailyOtterMod] Found ${otts.length} new Otters !`);
        clnt.guilds.cache.forEach((guild: Guild) => {
            sendOtter(guild, otts);
        });
    }, 5 * 60 * 60 * 1000, undefined, client);
    addTask(updateOtters);
    info('[DailyOtterMod] Add Task to update otters');
};

const _sendLast = sendLast;
export { _sendLast as sendLast };
