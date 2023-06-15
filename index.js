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

const checkEmail = (req, res, next) => {
  const email = req.query.email;
  if (email !== req.decodedEmail) {
    return res.status(401).send({ error: true, message: "Invalid Email" });
  }
  next();
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
    const taskCollection = client.db("TaskManagement").collection("tasks");
    app.post("/user", async (req, res) => {
      const { email } = req.body;
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

    app.get("/tasks/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await taskCollection.findOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        res.send({ error: true, message: error?.message });
      }
    });

    app.get("/tasks", verifyJWT, checkEmail, async (req, res) => {
      const email = req.query.email;
      try {
        const result = await taskCollection
          .find({ user_email: email })
          .toArray();
        res.send(result);
      } catch (error) {
        res.send({ error: true, message: error?.message });
      }
    });
    app.post("/task", async (req, res) => {
      try {
        const { title, user_email, description, status } = req.body;
        const result = await taskCollection.insertOne({
          title,
          description,
          status,
          user_email,
        });
        res.send(result);
      } catch (error) {
        res.send({ error: true, message: error?.message });
      }
    });

    app.delete("/tasks/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await taskCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.send({ error: true, message: error?.message });
      }
    });

    app.put("/tasks/:id", async (req, res) => {
      const id = req.params.id;
      const { title, description, status } = req.body;
      try {
        const result = await taskCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { title, description, status } },
          { upsert: true }
        );
        res.send(result);
      } catch (error) {
        res.send({ error: true, message: error?.message });
      }
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
