const express = require('express');
require("dotenv").config();
const jwt = require('jsonwebtoken')
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000
const stripe = require("stripe")(process.env.PAYMENT_GATEWAY_KEY);


app.use(cors())
app.use(express.json())

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

app.listen(port, () => {
    console.log('server in running on port: ',port)
})