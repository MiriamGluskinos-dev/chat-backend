const express = require("express");
const axios = require("axios");
const https = require("https");
const redis = require("./redisClient");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

async function main() {
  console.log("Connected to app");

  app.use(express.json());
  app.use(cors());
  app.post("/chat", async (req, res) => {
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
      document_ids: [],
    };

    try {
      const axiosOptions = {
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": "test-api-key",
          Accept: "*/*",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          "Cache-Control": "no-cache",
        },
      };

      let redis_conversation_id = null;
      if (!conversation_id) {
        const response = await axios.post(url, body, axiosOptions);

        await redis.set(
          `conversation_id_${response.data.conversation_id}`,
          response.data.conversation_id,
          {
            EX: 1800,
          }
        );
        return res.json(response.data);
      } else {
        redis_conversation_id = await redis.get(
          `conversation_id_${conversation_id}`
        );
        if (!redis_conversation_id)
          return res.status(404).send("Conversation ID not found or expired.");
        const response = await axios.post(url, body, axiosOptions);
        if (redis_conversation_id !== response.data.conversation_id) {
          return res.status(404).send("Conversation ID not found or expired.");
        }
        if (response)
          return res.status(response.status).send(response.data);
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
