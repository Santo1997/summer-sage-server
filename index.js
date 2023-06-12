const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.PAYMENT_KEY);
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
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
    const paymentData = client.db("summerCamp").collection("payments");

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
    app.get("/allCourses", verifyJWT, async (req, res) => {
      const result = await courseData.find().toArray();
      res.send(result);
    });

    app.get("/courses", async (req, res) => {
      let query = { status: "approved" };
      sortBy = { student_enroll: -1 };
      const result = await courseData.find(query).sort(sortBy).toArray();
      res.send(result);
    });

    app.get("/courses/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await courseData.findOne(query);
      res.send(result);
    });

    app.put("/updateInfoCourse/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updateCls = req.body;
      const setCls = {
        $set: {
          student_enroll: updateCls.student_enroll,
          available_seats: updateCls.available_seats,
        },
      };

      const result = await courseData.updateOne(filter, setCls, option);
      res.send(result);
    });

    //admin verify
    app.put("/updateValue/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updates = req.body;

      if (updates.status) {
        const setStatus = {
          $set: {
            status: updates.status,
          },
        };
        const statusResult = await courseData.updateOne(
          filter,
          setStatus,
          option
        );
        return res.send(statusResult);
      } else {
        const setFeedback = {
          $set: {
            feedback: updates.feedback,
          },
        };
        const result = await courseData.updateOne(filter, setFeedback, option);
        return res.send(result);
      }
    });

    app.put("/updateCourses/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updateCls = req.body;
      const setCls = {
        $set: {
          course_price: updateCls.course_price,
          available_seats: updateCls.available_seats,
          description: updateCls.description,
        },
      };

      const result = await courseData.updateOne(filter, setCls, option);
      res.send(result);
    });

    app.get("/userCourses", verifyJWT, async (req, res) => {
      let query = {};
      console.log(query);
      if (req.query?.user) {
        query = { "course_teacher.email": req.query.user };
      }
      const result = await courseData.find(query).toArray();
      res.send(result);
    });

    app.post("/course", verifyJWT, async (req, res) => {
      const newCls = req.body;
      const query = { course_name: newCls.course_name };
      const existingCls = await courseData.findOne(query);
      if (existingCls) {
        return res.send(existingCls);
      }
      const result = await courseData.insertOne(newCls);
      res.send(result);
    });

    //get user data
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await userData.find().toArray();
      res.send(result);
    });

    //get admin
    app.get("/author/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }
      const query = { email: email };
      const user = await userData.findOne(query);
      const result = { role: user.role };
      res.send(result);
    });

    //admin verify
    app.put("/updateUser/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updateUser = req.body;
      const setUser = {
        $set: {
          role: updateUser.role,
        },
      };
      const result = await userData.updateOne(filter, setUser, option);
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

      const query = { langId: cartItm.langId, user: cartItm.user };
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

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const toy = await cartData.deleteOne(query);
      res.send(toy);
    });

    //payment
    app.get("/allDayments", verifyJWT, async (req, res) => {
      const result = await paymentData.find().toArray();
      res.send(result);
    });

    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", verifyJWT, async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentData.insertOne(payment);
      res.send(insertResult);
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
