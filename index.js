const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const verrifyJWT = (req, res, next) => {
  const authorized = req.headers.authorization;
  if (!authorized) {
    return res.status(401).send({ error: true, message: "unauthorized" });
  }

  const token = authorized.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: "unauthorized" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qpcvbrd.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    const courseData = client.db("summerCamp").collection("courses");
    const userData = client.db("summerCamp").collection("users");
    const cartData = client.db("summerCamp").collection("carts");

    //jwt access
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userData.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ error: true, message: "forbidden" });
      }
      next();
    };

    //get course data
    app.get("/courses", async (req, res) => {
      sortBy = { student_enroll: -1 };
      const result = await courseData.find().sort(sortBy).toArray();
      res.send(result);
    });

    //get user data
    app.get("/users", verrifyJWT, verifyAdmin, async (req, res) => {
      const result = await userData.find().toArray();
      res.send(result);
    });

    //get teacher data
    app.get("/teachers", async (req, res) => {
      let query = { role: "instractor" };
      const result = await userData.find(query).toArray();
      res.send(result);
    });

    app.get("/teacher", async (req, res) => {
      let query = {};
      if (req.query?.user) {
        query = { email: req.query.user };
      }
      const results = await userData.find(query).toArray();
      res.send(results);
    });

    //post all user data
    app.post("/allusers", async (req, res) => {
      const newUser = req.body;
      const query = { email: newUser.email };
      const existingUser = await userData.findOne(query);
      if (existingUser) {
        return res.send(existingUser);
      }
      const result = await userData.insertOne(newUser);
      res.send(result);
    });

    // cart data
    app.post("/cart", async (req, res) => {
      const cartItm = req.body;

      const query = { langId: cartItm.langId };
      const existingCart = await cartData.findOne(query);
      if (existingCart) {
        return res.send(existingCart);
      }
      const result = await cartData.insertOne(cartItm);
      res.send(result);
    });

    app.get("/carts", verifyJWT, async (req, res) => {
      let query = {};
      if (req.query?.user) {
        query = { user: req.query.user };
      } else {
        res.send([]);
      }
      const results = await cartData.find(query).toArray();
      res.send(results);
    });

    //etc
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Summer Cump!");
});

app.listen(port, () => {
  console.log(`Summer Cump listening on port ${port}`);
});
