const dns = require("dns");

dns.setServers([
  "8.8.8.8",
  "8.8.4.4"
]);

console.log("DNS servers:", dns.getServers());

dns.resolveSrv(
  "_mongodb._tcp.cluster0.exbw7ov.mongodb.net",
  (error, addresses) => {
    if (error) {
      console.error("❌ DNS ERROR");
      console.error(error);
      return;
    }

    console.log("✅ DNS SUCCESS");
    console.log(addresses);
  }
);
