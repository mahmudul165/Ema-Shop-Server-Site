const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const admin = require("firebase-admin");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

//firebase admin initilization

const serviceAccount = require("./react-ema-john-simple-app-firebase-adminsdk-nxdw3-a70d35e19f.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
///middleware
app.use(cors());
app.use(express.json());
// connection

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.trtrt.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
//verify token
async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const idToken = req?.headers?.authorization?.split("Bearer ")[1];
    //console.log(idToken, "lphh");

    try {
      const decodeUser = await admin.auth().verifyIdToken(idToken);
      req.decodedUserEmail = decodeUser.email;
    } catch {}
  }
  next();
}

// connection fun and operation

async function run() {
  try {
    await client.connect();
    const database = client.db("online-shop");
    const productsCollection = database.collection("products");
    const ordersCollection = database.collection("orders");
    //get api
    app.get("/products", async (req, res) => {
      // console.log(req.query);
      const cursor = productsCollection.find({});
      // const products = await cursor.toArray();
      const page = req.query.page;
      const size = parseInt(req.query.size);
      let products;
      const count = await cursor.count();

      if (page) {
        products = await cursor
          .skip(page * size)
          .limit(size)
          .toArray();
      } else {
        products = await cursor.toArray();
      }
      res.send({ count, products });
    });
    // post to get data
    app.post("/products/byKeys", async (req, res) => {
      const keys = req.body;
      const query = { key: { $in: keys } };
      const products = await productsCollection.find(query).toArray();
      res.json(products);
    });
    // specifig user orders get item
    app.get("/orders", verifyToken, async (req, res) => {
      // console.log(req?.headers?.authorization?.startsWith(bearer), "love");
      const email = req.query.email;
      if (req.decodedUserEmail === email) {
        const query = { email: email };
        const cursor = await ordersCollection.find(query);
        //console.log(cursor, "love");
        const orders = await cursor.toArray();
        res.json(orders);
      } else if (req?.status === 401) {
        res.json({ message: "user not authorization" });
      }
    });
    // post insert data
    app.post("/orders", async (req, res) => {
      const order = req.body;
      order.createAt = new Date();
      console.log(order);
      const result = await ordersCollection.insertOne(order);
      //console.log(result);
      res.json(result);
    });
  } finally {
    //await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("ema john running");
});
app.listen(port, () => {
  console.log("port running", port);
});
