const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const shortid = require('shortid')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/exercise-track' )

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

const userSchema = new mongoose.Schema({
  username: String,
  userId: String,
  exercises: [{
    description: String,
    date: Date,
    duration: Number
  }]
});

const User = mongoose.model("User",userSchema);

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/exercise/new-user', (req,res) => {
  const id = shortid.generate();
  const newUser = {
    username: req.body.username,
    userId: id,
    exercises: []
  }
  new User(newUser).save();
  res.send(JSON.stringify(id));
});

app.post('/api/exercise/add/', (req, res) => {
  User.findOneAndUpdate({userId: req.body.userId},
                        {$push: {
                          exercises: {
                    description: req.body.description,
                    duration: req.body.duration,
                    date: new Date(req.body.date)}
                        }
                        },
                        {new: true},
                        ((err, results) => err ? res.send(err):res.send(results))
                       );
})

app.get('/api/exercise/log', (req, res) => {
  const id = req.query.userId;
  const limit = req.query.limit;
  const from = new Date(req.query.from);
  const to = new Date(req.query.to);
  User.findOne({userId: id}, (err,data) => {
    let response = data.exercises;
    if(from != 'Invalid Date' && to != 'Invalid Date') {
      response = response.filter(exer => exer.date >= from && exer.date <= to)
    } else if(from != 'Invalid Date') {
      response = response.filter(exer => exer.date >= from)
    };
    if(!isNaN(limit)) {
    response = response.slice(0,limit)
    };
    res.send(JSON.stringify(response))
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
