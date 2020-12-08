require('dotenv').config();

const { Client, MessageEmbed } = require('discord.js'); // Import client from discord.js
const client = new Client({             // Start instance of client
    partials: ['MESSAGE', 'REACTION']
});
const PREFIX = "&";                     // Prefix for the bot to use
const Gear = require("../models/gear.js");  // Schema used for database
const connectDB = require('../db.js');  // connect to MongoDB
const { collection } = require('../models/gear.js');
const { Aggregate } = require('mongoose');
connectDB();

// Logs to the console if the bot has succesfully logged in
client.on('ready', () => {
    console.log(`${client.user.tag} has logged in`);
});

client.on('message', async (message) => {
    if (message.author.bot) return;             // Ignores messages sent by bots
    if (message.content.startsWith(PREFIX)) {   // If message starts with specified prefix
        // Trims off the prefix and splits message into command (CMD_NAME) and an array of the passed args
        const [CMD_NAME, ...args] = message.content
            .trim()
            .substring(PREFIX.length)
            .split(/\s+/);  // Regex to eliminate white spaces

        if (CMD_NAME === 'kick') {                      // Kick command
            if (!message.member.hasPermission('KICK_MEMBERS'))
                return message.reply('You do not have permissions to use that command');
            if (args.length === 0)
                return message.reply('Please provide an ID');
            const member = message.guild.members.cache.get(args[0]);
            if (member) {
                member.kick()
                    .then((member) => message.channel.send(`${member} was kicked.`))
                    .catch((err) => message.channel.send('I cannot kick that user :('))
            } else {
                message.channel.send('That member was not found');
            }

        } else if (CMD_NAME === 'ban') {                    // Ban command
            if (!message.member.hasPermission('BAN_MEMBERS'))
                return message.reply('You do not have permissions to use that command');
            if (args.length === 0)
                return message.reply('Please provide an ID');
            try {
                const user = await message.guild.members.ban(args[0]);
                message.channel.send('User was banned succesfully.');
            } catch (error) {
                message.channel.send('An error occured. Either I do not have permissions or the user was not found.');
            }

        } else if (CMD_NAME === 'gear') {                   // Gearbot command
            if (args.length === 0)      // If there are no arguments, requests the user for input
                return message.reply('please provide either a link to your gear or a user ID.');
            const member = message.mentions.users.first();  // Sets member to be who the user @'s
            if (member) {       // If message contains a member
                Gear.findOne({
                    userID: member.id   // Searches database for entry with userID matching the member ID
                }, (err, gear) => {     // Passes the cursor
                    if (err) console.log(err);
                    if (!gear) {        // If no user exists with matching ID
                        message.reply(`that user is not in the database.`);
                    } else {
                        message.channel.send(new MessageEmbed()
                            .setColor('#07772B')
                            .setTitle(member.username)
                            .setDescription('AP: ' + gear.ap + '\nAAP: ' + gear.aap + '\nDP: ' + gear.dp)
                            .setThumbnail('https://cdn.discordapp.com/attachments/742673775853830245/769642313449209867/IngenMix1.png')
                            .setImage(gear.gearLink));
                    }
                });

            } else {    // Else if the message doesn't @ a user
                const filter = message.author.id;
                const update = args[0];
                if (validURL(args[0]) === true) {
                    Gear.findOneAndUpdate({ userID: filter }, { $set: { gearLink: update } }, { new: true }, (err, gear) => {
                        if (err) console.log("Something wrong with updating data");
                        if (!gear) {
                            const gear = new Gear({
                                userID: message.author.id,
                                gearLink: args[0]
                            });
                            gear.save().catch(err => console.log(err)).then(message.channel.send('You have been added to the database!'));
                        }
                    });
                    message.channel.send('your gear has been updated!');
                } else {
                    message.reply('invalid URL.');
                }
            }

        } else if (CMD_NAME === 'input') {                  // Input command
            const user = message.author.id;
            for (i = 0; i < args.length; i++) {
                const update = args[i + 1];

                if (args[i] === 'ap') {
                    Gear.findOneAndUpdate({ userID: user }, { $set: { ap: update } }, { new: true }, (err, gear) => {
                        if (err) message.channel.send('Error updating your AP, try $help for more info.');
                        else message.channel.send('Your AP has been updated!');
                    });
                    i++;
                } else if (args[i] === 'aap') {
                    Gear.findOneAndUpdate({ userID: user }, { $set: { aap: update } }, { new: true }, (err, gear) => {
                        if (err) message.channel.send('Error updating your Awakening AP, try $help for more info.')
                        else message.channel.send('Your Awakening AP has been updated!');
                    });
                    i++;
                } else if (args[i] === 'dp') {
                    Gear.findOneAndUpdate({ userID: user }, { $set: { dp: update } }, { new: true }, (err, gear) => {
                        if (err) message.channel.send('Error updating your DP, try $help for more info.');
                        else message.channel.send('Your DP has been updated!');
                    });
                    i++;
                }
            }

        } else if (CMD_NAME === 'leaderboard') {                    // Leaderboard command
            /* add multiple leaderboard top 10, 15, 20, 50 */
            // ** GS is sorted properly, but stats and usernames are not properly tied ** //
            Gear.aggregate([
                {
                    $project: {
                        _id: '$userID',
                        ap: 1,
                        aap: 1,
                        dp: 1,
                        gs: { $sum: { $add: [{ $divide: [{ $add: ['$ap', '$aap'] }, 2] }, '$dp'] } },
                    }
                }, // Group by userID and calculates gearscore ((ap+aap/2)+dp)
                { $sort: { gs: -1 } },  // Sorts the group by ascending gearscore
                { $limit: 10 }          // limits the output to top 10 only
            ]).exec((err, res) => {
                if (err) console.log(err);
                let embed = new MessageEmbed().setTitle("Leaderboard").setThumbnail('https://cdn.discordapp.com/attachments/742673775853830245/769642313449209867/IngenMix1.png');
                if (res.length === 0)
                    embed.setColor("RED").addField("No data found.");
                embed.setColor("#07772B");
                for (i = 0; i < res.length; i++) {
                    let member = message.guild.members.cache.get(res[i]._id) || "User Left"     // Add family name field as solution -!
                    message.guild.members.fetch(res[i].userID);
                    if (member === "User Left") {
                        embed.addField(`${i + 1}. ${member}`, `**AP:** ${res[i].ap}` + ` **AAP:** ${res[i].aap}` + ` **DP:** ${res[i].dp}` + ` **GS:** ${Math.round(res[i].gs)}`);
                    } else {
                        embed.addField(`${i + 1}. ${member.user.username}`, `**AP:** ${res[i].ap}` + ` **AAP:** ${res[i].aap}` + ` **DP:** ${res[i].dp}` + ` **GS:** ${Math.round(res[i].gs)}`);
                    }
                }
                message.channel.send(embed);
            })
        } else if (CMD_NAME === 'help') {
            let embed = new MessageEmbed()
                .setTitle('Help Center')
                .setThumbnail('https://cdn.discordapp.com/attachments/742673775853830245/769642313449209867/IngenMix1.png')
                .setColor('07772B')
                .addField('$gear', 'To look up a users gear provide @user, to update your gear provide a valid link to your gear image.')
                .addField('$leaderboard', 'Displays the top 25 players in the guild sorted by gearscore. If you do not use $input you will not show up on the leaderboard.')
                .addField('$input', 'Manual input for your stats. use $input <stat> <number> to update. Example: $input ap 162. You can update more than one stat at a time. Example: $input ap 162 aap 203 dp 301');

            message.channel.send(embed);
        } else {
            message.reply('Invalid command.');
        }
    }
});

client.on('messageReactionAdd', (reaction, user) => {
    const { name } = reaction.emoji;
    const member = reaction.message.guild.members.cache.get(user.id)
    if (reaction.message.id === '752459416506204211') {
        switch (name) {
            case '🍎':
                member.roles.add('752465387429560330');
                break;
            case '🍌':
                member.roles.add('752465631630196748');
                break;
            case '🍇':
                member.roles.add('752465445994496080');
                break;
            case '🍐':
                member.roles.add('752465578811326465');
                break;
        }
    }
});

client.on('messageReactionRemove', (reaction, user) => {
    const { name } = reaction.emoji;
    const member = reaction.message.guild.members.cache.get(user.id)
    if (reaction.message.id === '752459416506204211') {
        switch (name) {
            case '🍎':
                member.roles.remove('752465387429560330');
                break;
            case '🍌':
                member.roles.remove('752465631630196748');
                break;
            case '🍇':
                member.roles.remove('752465445994496080');
                break;
            case '🍐':
                member.roles.remove('752465578811326465');
                break;
        }
    }
});

function validURL(str) {
    var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    return !!pattern.test(str);
}

client.login(process.env.DISCORDJS_BOT_TOKEN);