import { Command, CommandType } from '../interfaces/command';
import { CallbackOptions } from '../interfaces/callbackoptions';
import configModel from '../schemas/doconf-schema';

export = {
    name: 'set',
    type: CommandType.BOTH,
    category: 'DailyOttr',
    maxArgs: 0,
    permissions: ['ADMINISTRATOR'],
    description: 'Set the text channel where the Bot should post the Otts.',
    run: async ({ message, member, interaction }: CallbackOptions) => {

        let channel = undefined;

        if (message) channel = message.channel;
        else if (interaction) channel = interaction.channel;
        else return;

        if (!channel) return;
        try {
            await configModel.findOneAndUpdate({
                _id: member.guild.id,
            }, {
                _id: member.guild.id,
                channelId: channel.id,
            }, {
                upsert: true,
            });

            if (message) channel.send(`Set ${channel} as Ott channel !`);
            else if (interaction) interaction.reply({ content: `Set ${channel} as Ott channel !` });
        }
        catch (error) {
            console.log(error);
        }
    },
} as Command;

