const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
var cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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
    const teacherData = client.db("summerCamp").collection("teachers");

    app.get("/courses", async (req, res) => {
      sortBy = { student_enroll: -1 };
      const result = await courseData.find().sort(sortBy).toArray();
      res.send(result);
    });
    app.get("/teachers", async (req, res) => {
      const result = await teacherData.find().toArray();
      res.send(result);
    });

    app.get("/teacher", async (req, res) => {
      let query = {};
      if (req.query?.user) {
        query = { email: req.query.user };
      }
      const results = await teacherData.find(query).toArray();
      res.send(results);
    });

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
