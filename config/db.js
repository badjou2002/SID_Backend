const mongoose = require('mongoose');
const dns = require('dns');

// DNS_SERVERS=8.8.8.8,1.1.1.1 (optionnel)
// Force les résolutions DNS de Node (c-ares) sur des serveurs explicites,
// utile lorsque la liste système contient des serveurs DNS inutilisables.
if (process.env.DNS_SERVERS) {
  const servers = process.env.DNS_SERVERS.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (servers.length > 0) {
    dns.setServers(servers);
  }
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|querySrv/i.test(error.message)) {
      console.error(
        'Hint: DNS/network failure. Set DNS_SERVERS=8.8.8.8,1.1.1.1 in .env or check MONGO_URI.'
      );
    }
    process.exit(1);
  }
};

module.exports = connectDB;
