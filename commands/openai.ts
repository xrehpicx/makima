import { SlashCommandBuilder, ChatInputCommandInteraction, CacheType, MessageContextMenuCommandInteraction, UserContextMenuCommandInteraction, Message } from "discord.js";
import { ask } from "../lib/openai";

const command = new SlashCommandBuilder()
    .setName('chat')
    .setDescription('control stuff')
    .addStringOption(option =>
        option.setName('message')
            .setDescription('message to send')
            .setRequired(true)
    )

let isExecutingQueue = false;
const executionQueue: Array<ChatInputCommandInteraction<CacheType> | MessageContextMenuCommandInteraction<CacheType> | UserContextMenuCommandInteraction<CacheType>> = [];
let lastExecutedContent: string | null = null;

export const OpenAiCommand = {
    command,
    async execute(interaction: ChatInputCommandInteraction<CacheType> | MessageContextMenuCommandInteraction<CacheType> | UserContextMenuCommandInteraction<CacheType>) {
        console.log("running chat command");

        // Skip consecutive runs with the same content
        const messageContent = interaction.options.data.find(opt => opt.name === 'message')?.value as string;
        if (lastExecutedContent === messageContent) {
            console.log("Skipping consecutive run with the same content.");
            return;
        }

        // Add the interaction to the queue
        executionQueue.push(interaction);

        // If the queue is already being processed, wait for the next turn
        if (isExecutingQueue) {
            console.log("Queued for execution.");
            return;
        }

        // Process the queue
        isExecutingQueue = true;

        while (executionQueue.length > 0) {
            const queuedInteraction = executionQueue.shift();

            if (queuedInteraction) {
                // Update the last executed content
                lastExecutedContent = messageContent;

                try {
                    await queuedInteraction.user.send("Running chat command");

                    // Check user role
                    if (!(!Array.isArray(queuedInteraction.member?.roles) && queuedInteraction.member?.roles.cache.find(r => r.name === 'kin-dev' || r.name === 'tokio'))) {
                        await queuedInteraction.user.send("Running chat command?");
                        continue;
                    }

                    const res = await ask(`${messageContent}\nuser_id: ${queuedInteraction.member.user.id}\n---meta-data---\nchannelId: ${queuedInteraction.channelId}`, queuedInteraction.channelId);

                    console.log("res", res);
                    await queuedInteraction.editReply(res?.content ?? "No reply from model");
                } catch (e) {
                    console.error("Error in OpenAiCommand:", e);
                }
            }
        }

        // Reset the flag once the queue is processed
        isExecutingQueue = false;
    }
};


let isProcessingQueue = false;
const dmQueue: Array<Message<boolean>> = [];
let lastProcessedContent: string | null = null;

export const handleDM = async (message: Message<boolean>) => {
    console.log("message", message.content);

    // Skip consecutive runs with the same content
    if (lastProcessedContent?.toLocaleLowerCase().trim() === message.content.toLocaleLowerCase().trim()) {
        console.log("Skipping consecutive run with the same content.");
        return;
    }

    // Add the message to the queue
    dmQueue.push(message);

    // If the queue is already being processed, wait for the next turn
    if (isProcessingQueue) {
        console.log("Queued for processing.");
        return;
    }

    // Process the queue
    isProcessingQueue = true;

    while (dmQueue.length > 0) {
        const queuedMessage = dmQueue.shift();

        if (queuedMessage) {
            // Update the last processed content
            lastProcessedContent = queuedMessage.content;

            // Function to stop typing when needed
            const stopTyping = typingController(queuedMessage);

            try {
                const res = await ask(`${queuedMessage.content}\nuser_id: ${queuedMessage.author.id}\nchannelId: ${queuedMessage.channelId}` as string, queuedMessage.channelId);
                console.log("res", res?.content);
                queuedMessage.channel.send(res?.content ?? "No reply from the model");
            } catch (e) {
                console.error("Error in handleDM:", e);
            } finally {
                // Stop typing
                stopTyping();
            }
        }
    }

    // Reset the flag once the queue is processed
    isProcessingQueue = false;
};


// keep sending typing events to keep the bot typing until its stopped from the retuned controller
function typingController(message: Message<boolean>) {
    const interval = setInterval(() => {
        message.channel.sendTyping()
    }, 5000)
    return () => {
        clearInterval(interval)
    }
}

