import { Command, CommandType } from '../interfaces/command';
import { CallbackOptions } from '../interfaces/CallbackOptions';
import { sendLast } from '../mods/dailyotter';
import { ApplicationCommandOptionData, Constants } from 'discord.js';

export = {
    name: 'send',
    type: CommandType.BOTH,
    category: 'DailyOttr',
    maxArgs: 1,
    description: 'Send the last or a limited amount of Otters',
    expectedArgs: '[limit]',
    options: [
        {
            name: 'limit',
            description: 'Number of Otters to fetch',
            required: true,
            type: Constants.ApplicationCommandOptionTypes.NUMBER,
        } as ApplicationCommandOptionData,
    ],
    run: async ({ message, args, interaction, member }: CallbackOptions) => {

        const { guild } = member;
        if (message) {

            let limit = 1;
            if (args && args[0]) {
                limit = parseInt(args[0]);
                if (isNaN(limit)) {
                    message.reply('The given limit was no number.');
                    return;
                }
            }

            sendLast(guild, limit);
        }
        else if (interaction) {
            if (!interaction.channel) return;
            interaction.deferReply({
                ephemeral: true,
            });

            const limit = interaction.options.getNumber('limit')!;
            await sendLast(guild, limit);
            interaction.editReply({
                content: 'Otters sent.',
            });
        }
    },
} as Command;

