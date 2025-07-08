const { createClient } = require("redis");
const redisClient = createClient();

redisClient
  .connect()
  .then(() => console.log("redis connected!"))
  .catch((err) => console.log("redis error" + err));

module.exports = redisClient;
