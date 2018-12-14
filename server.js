const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGOLAB_URI || 'mongodb://dominus:trajectory1@ds119800.mlab.com:19800/fcc-backend-js')
var Schema = mongoose.Schema;

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

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


//Setting up models
//Model to store only usernames
var User = mongoose.model('User', new Schema({username:{type: String, required: true}}));

//Model to log exercises for corresponding usernames
var exerciseSchema = new Schema({
  userId: {type: String, required: true},
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: Date
});

var Exercise = mongoose.model('Exercise', exerciseSchema);

//Setting up post actions
//Endpoint to create a new user
app.post('/api/exercise/new-user', function(req,res) {
  var username = req.body.username;
  User.count({username: username}, (err, count) => {
    if (err) {
      console.log(err);
      res.json({"error": err});
    }
    if (count > 0) {
      res.end("<p>User '" + username + "' already exists!!</p>");
    }
    const user = new User({username: username});
    user.save((err,data) => err ? console.log(err) : res.json({"id": data._id, "username": data.username}));
  })
});

//This endpoint logs a user exercises when given at least the userId
app.post('/api/exercise/add', function(req,res) {
  var userId = req.body.userId;
  User.count({username:userId}, (err,count) => {
    if (err) {
      console.log(err);
      res.json({"error": err});
    }
    if (count <= 0) {
      res.end("<p>User '" + userId + "' doesn't exist!!</p>");
    }
    const exercise = new Exercise(
      {
        userId: req.body.userId,
        description: req.body.description,
        duration: req.body.duration,
        date: new Date(req.body.date)
      }
    );
    exercise.save((err,data) => err ? console.log(err) : res.json({"user":data.userId,"description":data.description,"duration":data.duration,"date":data.date}));
  })
});

//Get action to fetch exercise logs for user
app.get('/api/exercise/log', function(req,res) {
  if (!req.query.userId) res.end("<p>User Id needed in query!!</p>");
  else {
    var query;
    let response = {};
    var userId = req.query.userId;
    var from = req.query.from;
    var to = req.query.to;
    
    if (from && to) 
      response = {userId: userId, date: { $gt: new Date(from), $lt: new Date(to)}};
    else if(from) 
      response = {userId: userId, date: { $gt: new Date(from)}};
    else if(to) 
      response = {userId: userId, date: { $lt: new Date(to)}};
    else 
      response = {userId: userId};
    
    query = req.query.limit ? Exercise.find(response).limit(Number(req.query.limit)) : Exercise.find(response);
    //Writing response to client
    query.exec((err,data) => {
      let count = 0;
      data.forEach((user) => {
        res.write("<p>"+ ++count +".</p><p>UserId: "+ user.userId +"</p><p>Description: "+ user.description +"</p><p>Duration: "+ user.duration +"</p><p>Date: "+ user.date +"</p>", ['Transfer-Encoding', 'chunked']);
      });
      res.end();
    });
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
