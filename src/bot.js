require ('dotenv').config();

const {Client} = require('discord.js');
const client = new Client({
    partials:['MESSAGE', 'REACTION']
});
const PREFIX = "$";
const Gear = require("../models/gear.js");
const mongoose = require("mongoose");
mongoose.set('useUnifiedTopology', true);
mongoose.set('useFindAndModify', false);

mongoose.connect('mongodb://localhost/Gear', {useNewUrlParser: true});

client.on('ready', () => {
    console.log(`${client.user.tag} has logged in`);
});

client.on('message', async (message) => {
    if (message.author.bot) return;
    if (message.content.startsWith(PREFIX)) {
        const [CMD_NAME, ...args] = message.content
        .trim()
        .substring(PREFIX.length)
        .split(/\s+/);

        if (CMD_NAME === 'kick') {
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
        } else if (CMD_NAME === 'ban') {
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
        } else if (CMD_NAME === 'gear') {
            if (args.length === 0)
                return message.reply('please provide either a link to your gear or a user ID.');
            const member = message.mentions.users.first();
            if (member) {
                //message.channel.send(`${member} has gear of...`);
                Gear.findOne({
                    userID: member.id
                }, (err, gear) => {
                    if (err) console.log(err);
                    if (!gear) {
                        message.reply(`that user is not in the database.`);
                    } else {
                        message.channel.send(`${member.username} has gear of ${gear.gearLink}`);
                    }
                })
            } else {
                const filter = message.author.id;
                const update = args[0];
                if (validURL(args[0]) === true) {
                    Gear.findOneAndUpdate({ userID: filter }, {$set:{ gearLink: update }}, {new: true}, (err, gear) => {
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
        } else {
            message.reply('Invalid command.');
        }
    }
});

client.on('messageReactionAdd', (reaction, user) => {
    const {name} = reaction.emoji;
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
    const {name} = reaction.emoji;
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
    var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
  return !!pattern.test(str);
}

client.login(process.env.DISCORDJS_BOT_TOKEN);