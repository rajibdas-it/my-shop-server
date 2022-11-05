const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
require("colors");
const jwt = require("jsonwebtoken");

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).send("server is running");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fe8xrlp.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(403).send({ message: "unauthorize access" });
  }
  const token = authHeader.split(" ")[1];
  console.log(token);
  jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
    if (err) {
      res.status(403).send({ message: "unauthorize access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const productCollection = client.db("myShop").collection("product");
    const orderCollection = client.db("myShop").collection("orders");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.SECRET_TOKEN, {
        expiresIn: "5h",
      });
      res.send({ token });
    });

    app.get("/products", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      // console.log(page, size);
      const query = {};
      const cursor = productCollection.find(query);
      const products = await cursor
        .skip(page * size)
        .limit(size)
        .toArray();
      const count = await productCollection.estimatedDocumentCount();
      res.send({ count, products });
    });

    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });
    app.get("/orders", verifyJWT, async (req, res) => {
      // const query = { email: req.query.email };

      // console.log(req.headers.authorization.split[1]);
      let query = {};
      if (req.query.email) {
        query = {
          email: req.query.email,
        };
      }
      const cursor = orderCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const updatedReq = req.body;
      // console.log(updatedReq.status);
      const updatedOrder = {
        $set: {
          status: updatedReq.status,
        },
      };
      const result = await orderCollection.updateOne(query, updatedOrder);
      res.send(result);
    });
  } finally {
  }
}
run().catch((error) => console.log(error));

app.listen(port, () => {
  console.log(`server running on port ${port}`.cyan);
});
