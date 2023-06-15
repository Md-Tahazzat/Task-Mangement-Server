const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = async (req, res, next) => {
  const authorization = req.headers?.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: "Unauthorized entry" });
  }
  const token = authorization.split(" ")[1];
  if (!token) {
    return res.status(401).send({ error: true, message: "Unauthorized entry" });
  }

  jwt.verify(token, process.env.SECRET_ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send({ error: true, message: "Forbidden Access" });
    }
    req.decodedEmail = decoded;
    next();
  });
};

// MongoDB connection uri
const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@cluster0.v7xfdwv.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const userCollection = client.db("TaskManagement").collection("users");

    app.post("/users", async (req, res) => {
      const { email } = req.body.user;
      // get token by signing jwt.
      const token = jwt.sign(email, process.env.SECRET_ACCESS_TOKEN);
      const existUser = await userCollection.findOne({ email });

      if (existUser) {
        existUser.token = token;
        return res.send(existUser);
      }
      const result = await userCollection.insertOne({
        email,
      });
      result.token = token;
      res.send(result);
    });
  } finally {
    //  await  client.close()
  }
}

run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("Task management server is running");
});

app.listen(port, () => {
  console.log(`app is running on port ${port}`);
});