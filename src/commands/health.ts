import configModel from '../schemas/doconf-schema';
import logger from '../core/logger';
import { VERSION } from '../version';
import Parser from 'rss-parser';
import { MessageEmbed } from 'discord.js';
import { Command, CommandType } from '../interfaces/command';
import { CallbackOptions } from '../interfaces/CallbackOptions';
const parser = new Parser();

export = {
    name: 'health',
    type: CommandType.NORMAL,
    category: 'DailyOttr',
    maxArgs: 0,
    permissions: ['ADMINISTRATOR'],
    description: 'Health report about the DailyOttr bot. This call is expensive..',
    run: async ({ message, member }: CallbackOptions) => {

        if (!message) return;

        const { guild } = member;

        let rss = false;
        let channel = false;
        let embed = false;

        // check feed
        try {
            const feed = await parser.parseURL('https://dailyotter.org/?format=rss');
            if (feed.items.length > 0) rss = true;
        }
        catch (err) {
            logger.error(`[DailyOtterMod] ${err}`);
        }

        try {
            const confChannel = await configModel.findOne({ _id: guild.id });
            if (!confChannel) return;
            const ottChannel = guild.channels.cache.get(confChannel.channelId);
            if (!ottChannel) throw Error('Channel not configured or not found on that server.');

            // set true if all passes
            channel = true;

            const ottEmbed = new MessageEmbed()
                .setTitle('DailyOtterMod Test');
            if (ottChannel.isText()) {
                await ottChannel.send({ embeds: [ottEmbed] })
                    .then(msg => {
                        msg.delete();
                    });
                embed = true;
            }

        }
        catch (err) {
            logger.error(`[DailyOtterMod] ${err}`);
        }
        let checkmsg = `Healthcheck for **DailyOttr Bot** Version \`${VERSION}\`\n\n`;

        checkmsg += rss ? '🟢' : '🔴';
        checkmsg += ' Reachability of the Dailyotter.org RSS Feed\n';

        checkmsg += channel ? '🟢' : '🔴';
        checkmsg += ' Channel configured and found on this server\n';

        checkmsg += embed ? '🟢' : '🔴';
        checkmsg += ' Permission to send Embeds in the configured channel';
        message.channel.send(checkmsg);

        message.channel.send(`Set ${message.channel} as Ott channel !`);
    },
} as Command;
