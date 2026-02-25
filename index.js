require('dotenv').config();

const { 
    Client, 
    GatewayIntentBits, 
    Collection 
} = require('discord.js');

const mongoose = require('mongoose');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites
    ]
});

client.invites = new Collection();


// MONGODB CONNECTION


mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ Mongo Error:", err));


// INVITE SCHEMA


const inviteSchema = new mongoose.Schema({
    userId: String,
    invites: { type: Number, default: 0 },
    claimed: { type: Number, default: 0 }
});

const Invite = mongoose.model('Invite', inviteSchema);


// READY EVENT


client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) return console.log("❌ Guild not found");

    const invites = await guild.invites.fetch();
    client.invites.set(guild.id, invites);
});


// TRACK INVITES


client.on('guildMemberAdd', async member => {
    const guild = member.guild;

    const newInvites = await guild.invites.fetch();
    const oldInvites = client.invites.get(guild.id);

    const usedInvite = newInvites.find(inv => 
        oldInvites.get(inv.code)?.uses < inv.uses
    );

    client.invites.set(guild.id, newInvites);

    if (!usedInvite) return;

    const inviterId = usedInvite.inviter.id;

    let data = await Invite.findOne({ userId: inviterId });

    if (!data) {
        data = new Invite({ userId: inviterId });
    }

    data.invites += 1;
    await data.save();

    console.log(`📈 ${usedInvite.inviter.tag} now has ${data.invites} invites`);
});

////////////

client.login(process.env.TOKEN);
