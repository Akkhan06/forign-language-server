const express = require('express');
require("dotenv").config();
const jwt = require('jsonwebtoken')
const cors = require('cors');
const app = express()
require("dotenv").config();
const port = process.env.PORT || 5000
const stripe = require("stripe")(process.env.PAYMENT_GATEWAY_KEY);

app.use(cors())
app.use(express.json())

//========VARIFY JWT==========
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    // bearer token
    const token = authorization.split(" ")[1];
  
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res
          .status(401)
          .send({ error: true, message: "unauthorized access" });
      }
      req.decoded = decoded;
      next();
    });
  };




app.get('/', (req, res) => {
    res.send('hello world')
})


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5stkogd.mongodb.net/?retryWrites=true&w=majority`;

console.log(uri);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("foreignDB").collection("user");
    const classesCollection = client.db("foreignDB").collection("classes");
    const selectedCollection = client.db("foreignDB").collection("selected");
    // const paymentCollection = client.db('foreignDB').collection('payment')

    //===========JWT API=========
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //===========VARIFY ADMEN=======
  const verifyAdmin = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email };
    const user = await usersCollection.findOne(query);
    if (user?.role !== "admin") {
      return res
        .status(403)
        .send({ error: true, message: "forbidden message" });
    }
    next();
  };

  // =====SELECTED ITEMS POST API======
  app.post('/select', async(req, res) => {
    const selectedItem = req.body;
    const result = await selectedCollection.insertOne(selectedItem)
    res.send(result)
    console.log(result)
  })

  // =====SELECTED ITEMS GET API=====
  app.get('/selected', verifyJWT, async(req, res) => {
    const email = req.query.email;
      if (!email) {
        res.send([]);
      }
console.log("105",email)
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "porviden access" });
      }

      const query = { email: email };
      const result = await selectedCollection.find(query).toArray();
      console.log("14",result)
      res.send(result);
})



// ====SELECTED SINGLE DATA API=========
app.get('/selectedonde/:id', async(req, res) => {
  const id = req.params.id;
  const query = {_id: new ObjectId(id)}
  const result = await selectedCollection.findOne(query)
  res.send(result)
  console.log("124",result);
})


// =====PAYMENT GETWAY INTENT========
app.post("/create-payment-intent", async (req, res) => {
  const { price } = req.body;

  // Create a PaymentIntent with the order amount and currency
  const amount = price *100
  console.log(price, amount)
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: "usd",
    payment_method_types: ["card"],
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});


// ====PAYMENT API DATA=======
app.patch("/payment/:id", verifyJWT, async (req, res) => {
const id = req.params.id;
const query = {_id: new ObjectId(id)}
const options = {upsert: true}
const updateDoc = {
  $set: {
    payment: 'complete'
  },
};
const result = await selectedCollection.updateOne(query, updateDoc, options);
console.log(result)
res.send(result);

});

// =====PAYMENT GET API======


  // =======VARIFY INSTRUCTOR=========
  const verifyInstructor = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email };
    const user = await usersCollection.findOne(query);
    if (user?.role !== "instructor") {
      return res
        .status(403)
        .send({ error: true, message: "forbidden message" });
    }
    next();
  };

// =============POST USER API===========
    app.post('/user', async(req, res) => {
      const user = req.body;
      console.log(user)
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already have" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result)
    })

    // ===========GET ALL USER API========
    app.get("/user", async(req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });


    // =======CHECK ANDMIN EMAIL========
    app.get("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
        return
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    // ======CHECK INSTRUCTOR IMAIL=====
    app.get("/user/instructor/:email", verifyJWT, verifyInstructor, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ instructor: false });
        return
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
    });

    // =====MAKE ADMIN API========
    app.patch('/user/admin/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.send(result);

    })

    // ========MAKE INSTRUCTOR API=======
    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.send(result);

    })



    // =====ADD COURSE POST API========
    app.post('/addclass', verifyJWT,  async(req, res) => {
      const classes = req.body;
      const result = await classesCollection.insertOne(classes)
      res.send(result)
    })


// ===========MY CLASSES GET API========
    app.get('/myclass', verifyJWT, async(req, res) => {
      const result = await classesCollection.find().toArray()
      res.send(result)
  })

  
    app.get("/parsonaldata", verifyJWT,  async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "porviden access" });
      }

      const query = { email: email };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });


// ========MY CLASSES UPDATE STATUS=========
app.put('/myclass/:id', async(req, res) => {
  const id = req.params.id;
  const query = {_id: new ObjectId(id)}
  const options = { upsert: true };
  const updateDoc = {
    $set: {
      status: "approved"
    },
  };
  const result = await classesCollection.updateOne(query, updateDoc, options);
  console.log(result)
  res.send(result)
})

app.put('/danied/:id', verifyJWT, async(req, res) => {
  const id = req.params.id;
  const query = {_id: new ObjectId(id)}
  const options = { upsert: true };
  const updateDoc = {
    $set: {
      status: "denied"
    },
  };
  const result = await classesCollection.updateOne(query, updateDoc, options);
  console.log(result)
  res.send(result)
})

// app.put('/selected/:id', verifyJWT, async(req, res) => {
//   const id = req.params.id;
//   const query = {_id: new ObjectId(id)}
//   const options = { upsert: true };
//   const updateDoc = {
//     $set: {
//       status: "selected"
//     },
//   };
//   const result = await classesCollection.updateOne(query, updateDoc, options);
//   console.log(result)
//   res.send(result)
// })


// ========MY CLASSES GET ONE STATUS=========
app.get('/myclass/:id', verifyJWT, async(req, res) => {
  const id = req.params.id;
  const query = {_id: new ObjectId(id)}
  const result = await classesCollection.findOne(query)
  res.send(result)
})


// =======CLASSES POST API=========
app.post('/classes', verifyJWT, async(req, res) => {
  const classes = req.body;
      const result = await classesCollection.insertOne(classes)
      res.send(result)
})

// ========CLASSES GET API==========
app.get('/allclass', async(req, res) => {
      const result = await classesCollection.find().toArray()
      res.send(result)
})

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.listen(port, () => {
    console.log('server in running on port: ',port)
})