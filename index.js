const express = require('express');
const redis = require('redis');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 8080;

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || 6379;
const redisExpire = parseInt(process.env.REDIS_EXPIRE_SECONDS) || 60;

const client = redis.createClient({
    socket: {
        host: redisHost,
        port: redisPort
    }
});

client.on('error', (err) => {
    console.error('Redis Client Error', err);
});

async function main() {
    await client.connect();

    app.use(express.json());

    app.post('/chat', async (req, res) => {
        const { message, conversation_id } = req.body;

        if (!message) {
            return res.status(400).send("Missing 'message' parameter.");
        }

        const url = "https://omn.mdev.mehes.gov.il/api/v1/templates/chat";
        const body = {
            message,
            workflow_type: "template",
            conversation_id: conversation_id || "",
            use_rag: false,
            document_ids: []
        };

        try {
            if (!conversation_id) {
                const response = await axios.post(url, body, {
                    headers: {
                        'X-API-KEY': 'test-api-key'
                    }
                });
                const newId = response.data.conversation_id;
                await client.set(newId, "1", { EX: 3600 }); // 1 hour
                return res.json(response.data);
            } else {
                const exists = await client.get(conversation_id);
                if (!exists) {
                    return res.status(404).send("Conversation ID not found or expired.");
                }

                const response = await axios.post(url, body, {
                    headers: {
                        'X-API-KEY': 'test-api-key'
                    }
                });
                return res.json(response.data);
            }
        } catch (error) {
            if (error.response) {
                return res.status(error.response.status).json(error.response.data);
            } else {
                return res.status(500).send("Internal error: " + error.message);
            }
        }
    });

    app.listen(port, () => {
        console.log(`App running on port ${port}`);
    });
}

main();
