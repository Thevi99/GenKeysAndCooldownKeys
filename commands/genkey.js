const { SlashCommandBuilder } = require('@discordjs/builders');
const { Buffer } = require('node:buffer');
const Key = require('../models/Key');
const { RoleFree, Perm } = require('../config.json');
const { random } = require('../utils/randomkey');

// Map สำหรับเก็บข้อมูลเวลาการใช้คำสั่งของแต่ละผู้ใช้ในแต่ละบทบาท
const cooldowns = {
    RoleFree: new Map(),
    Perm: new Map()
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("genkey")
        .setDescription("Generate one key")
        .addStringOption(option =>
            option.setName('game')
                .setDescription('Choose a game')
                .setRequired(true)
                .addChoices(
                    { name: "Key ALL Star (1 Day)", value: "key-all-star" }
                )
        )
        .addIntegerOption(option =>
            option.setName("amount")
                .setDescription("Amount must be 1")
                .setRequired(true)
        ),

    async run(client, interaction) {
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply({ ephemeral: true });
            }

            const userId = interaction.user.id;
            console.log("User ID:", userId, "use command");

            const now = Date.now();
            const expiryDate = new Date(now + 24 * 60 * 60 * 1000);

            let cooldownTime = 24 * 60 * 60 * 1000; // Default cooldown time

            if (!interaction.member.roles.cache.has(Perm) && !interaction.member.roles.cache.has(RoleFree)) {
                await interaction.editReply({
                    content: "You do not have permission to use this command.",
                    ephemeral: true
                });
                return;
            }

            if (interaction.member.roles.cache.has(Perm)) {
                cooldownTime = 0; // No cooldown time for Perm
            } else if (interaction.member.roles.cache.has(RoleFree)) {
                // Keep the default cooldown time for RoleFree
            }

            if (cooldowns[interaction.member.roles.cache.has(Perm) ? 'Perm' : 'RoleFree'].has(userId)) {
                const lastUsed = cooldowns[interaction.member.roles.cache.has(Perm) ? 'Perm' : 'RoleFree'].get(userId);
                const timeLeft = cooldownTime - (now - lastUsed);
                if (timeLeft > 0) {
                    const hoursLeft = (timeLeft / (60 * 60 * 1000)).toFixed(2);
                    await interaction.editReply({
                        content: `You must wait ${hoursLeft} hour(s) before using this command again.`,
                        ephemeral: true
                    });
                    return;
                }
            }

            cooldowns[interaction.member.roles.cache.has(Perm) ? 'Perm' : 'RoleFree'].set(userId, now);

            const amount = interaction.options.getInteger('amount');

            if (amount !== 1) {
                await interaction.editReply({
                    content: "Amount must be 1.",
                    ephemeral: true
                });
                return;
            }

            let key = '';
            let isDuplicate = true;

            // Loop จนกว่าจะสร้าง key ที่ไม่ซ้ำกับที่มีอยู่
            while (isDuplicate) {
                key = random(5) + "-" + random(5) + "-" + random(5) + "-" + random(5);
                const existingKey = await Key.findOne({ key });
                if (!existingKey) {
                    isDuplicate = false;
                }
            }

            const newKey = new Key({
                userId,
                key,
                generatedAt: now, 
                expiryDate: expiryDate.getTime(), 
            });

            await newKey.save();

            const sendResult = await interaction.user.send({
                content: "Here's your generated key:",
                files: [{
                    attachment: Buffer.from(key),
                    name: 'key.txt'
                }]
            });

            if (!sendResult) {
                await interaction.editReply({
                    content: "Failed to send the key. Please check your privacy settings and try again.",
                    ephemeral: true
                });
                return;
            }

            await interaction.editReply({
                content: "Check your DM for the generated key.",
                ephemeral: true
            });

        } catch (error) {
            console.error("Error in genkey command:", error);

            await interaction.editReply({
                content: "An error occurred while executing the command. Please try again later.",
                ephemeral: true
            });
        }
    }
};
