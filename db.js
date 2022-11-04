/** Database setup for BizTime. */

const { Client } = require("pg");

//code for Ashley database

const DB_URI = process.env.NODE_ENV === "test"
  ? "postgresql:///biztime_test"
  : "postgresql:///biztime";

//code for Michael database

// const DB_URI = process.env.NODE_ENV === "test"
//   ? "postgresql://mtbocim:tacocat@localhost/biztime_test"
//   : "postgresql://mtbocim:tacocat@localhost/biztime";

let db = new Client({
  connectionString: DB_URI
});

db.connect();
module.exports = db;