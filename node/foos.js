var spawn = require('child_process').spawn,
py = spawn('python', ['/app/foos.py']),
MongoClient = require('mongodb').MongoClient,
assert = require('assert'),
cookieParser = require('cookie-parser'),
bodyParser = require('body-parser'),
methodOverride = require('method-override'),
server = require('express'),
app = server(),
http = require('http').Server(app),
io = require('socket.io')(http),
dbUrl = 'mongodb://db:27017/foos';

io.set('transports', ['polling']);

// Load HTML source
app.get('/debug', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.use(cookieParser());
app.use(bodyParser());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
  next();
});

app.use(server.static(__dirname + '/views'));

app.get('/', function (req, res) {
  res.sendFile(path.resolve(__dirname + '/views/index.html'));
});

io.on('connection', function(socket){
  socket.emit('message', { text : 'Welcome!' });

  socket.on('chat message', function(msg){
    console.log(msg);
    io.emit('chat message', msg);
  });
  
  socket.on('subscribe', function (data) {
    socket.join(data.channel);
  });
});


http.listen(3000, function(){
  console.log('Listening on *:3000');
});


function insertDocument(jss) {
  MongoClient.connect(dbUrl, function(err, db) {
    if (err) {
      console.log('Unable to connect to DB!', err);
    }
    else {
      console.log('Connected to Database.');
      var collection = db.collection('foos');
      collection.insert(jss, function (err, result) {
        if (err) {
          console.log(err);
        }
        else {
          console.log('Inserted doc into db');
        }
        db.close();
     });
    }
  });
}


dataString = '';

py.stdout.on('data', function(data) {
  dataString = data.toString();
  if(dataString.indexOf("Game.Dump::") != -1) {
      js = dataString.split("Dump::")[1];
      jss = JSON.parse(js);
      console.log(jss);
      insertDocument(jss);
      console.log('output: ' + data.toString());
      io.emit('chat message', dataString);
      io.emit('message', "New Game");
  }
  else if(dataString.indexOf("---") != -1) {
      console.log('output: ' + data.toString());
      io.emit('chat message', dataString);
  }
  else if(dataString.indexOf("goal") != -1) {
      if(dataString.indexOf("\"valid\": true") != -1) {
          score = dataString.split("Score::")[1];
          io.emit('scores', score.split(/\r?\n/)[0]);
          console.log('output: ' + data.toString());
          io.emit('chat message', dataString);

      }
  }
  else {
       //jss = JSON.parse(dataString);
       //console.log(jss);
       //console.log('output: ' + data.toString());
       //io.emit('chat message', dataString);
  }
});

py.stdout.on('end', function() {
  console.log(dataString);
});
