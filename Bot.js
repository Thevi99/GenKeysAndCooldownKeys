const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const mongoose = require('mongoose');
const { token, mongoURI } = require('./config.json');
const Key = require('./models/Key');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(async () => {
    console.log('Connected to MongoDB');
    await deleteExpiredKeys(); // เรียกใช้ฟังก์ชันลบ key ที่หมดอายุทันทีหลังจากเชื่อมต่อ MongoDB เสร็จสิ้น
})
.catch(err => console.error('Failed to connect to MongoDB:', err));

// ฟังก์ชันเพื่อลบคีย์ที่หมดอายุ
async function deleteExpiredKeys() {
    try {
        await mongoose.connection.ready;
        const now = new Date(); // เวลาปัจจุบัน
        const result = await Key.deleteMany({ 
            $or: [
                { expiryDate: { $lte: now } }, // ลบ key ที่หมดอายุ
                { $expr: { $eq: ['$expiryDate', '$generatedAt'] } }, // ลบ key ที่ generatedAt เท่ากับ expiryDate
                { $expr: { $eq: ['$generatedAt', '$expiryDate'] } } // ลบ key ที่ expiryDate เท่ากับ generatedAt
            ]
        });
        console.log(`Deleted ${result.deletedCount} expired keys`);
    } catch (error) {
        console.error('Error deleting expired keys:', error);
    }
}

// ฟังก์ชันเพื่ออัปเดตข้อมูลใน MongoDB เมื่อคีย์หมดอายุ
async function updateKeyExpiry() {
    try {
        await mongoose.connection.ready;
        const now = Math.floor(Date.now() / 1000); // เวลาปัจจุบันในวินาที
        await Key.updateMany({ expiryDate: { $lt: now } }, { $set: { expired: true } }); // อัปเดตคีย์ที่หมดอายุ
        console.log('Updated expired keys');
    } catch (error) {
        console.error('Error updating expired keys:', error);
    }
}

client.once('ready', async c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);

    await deleteExpiredKeys(); // เรียกใช้ deleteExpiredKeys() เพื่อลบ key ที่หมดอายุตั้งแต่เริ่มต้น

    // เรียกใช้ deleteExpiredKeys() ทุกๆ 1 นาที
    setInterval(deleteExpiredKeys, 60 * 1000); 
    setInterval(updateKeyExpiry, 60 * 1000); // ทำการอัปเดตข้อมูล key ที่หมดอายุทุกๆ 1 นาที
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.run(client, interaction);
    } catch (error) {
        console.error("Error executing command:", error);

        if (!interaction.replied) {
            await interaction.reply({ content: 'Error executing command.', ephemeral: true });
        }
    }
});

client.login(token);
