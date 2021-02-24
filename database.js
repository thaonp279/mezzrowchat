require('dotenv').config(process.cwd+'/sample.env');
const { MongoClient } = require('mongodb');

async function run(callback) {
  const client = new MongoClient(process.env.MONGO_URI, { useUnifiedTopology: true });
  try {
    await client.connect();
    await callback(client);
  } catch(e) {
    console.error(e);
    throw new Error('Unable to Connect to Database');
  }
}

module.exports = run;