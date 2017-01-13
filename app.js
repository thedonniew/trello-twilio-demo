// js xml escape
if (!String.prototype.encodeHTML) {
  String.prototype.encodeHTML = function () {
    return this.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&apos;');
  };
}

// Load app dependencies
var http = require('http'),
    path = require('path'),
    express = require('express'),
    twilio = require('twilio');

// Load configuration information from system environment variables.
var TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN,
    TWILIO_NUMBER = process.env.TWILIO_NUMBER;

var TRELLO_KEY = process.env.TRELLO_KEY,
    TRELLO_TOKEN = process.env.TRELLO_TOKEN;

var Trello = require("trello");
var trello = new Trello(TRELLO_KEY, TRELLO_TOKEN);
var myList = "58752899c1e32993869efd42";

// Create an authenticated client to access the Twilio REST API
var client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Create an Express web application with some basic configuration
var app = express();

app.configure(function(){
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
    app.use(express.errorHandler());
});

// render our home page
app.get('/', function(request, response) {
    response.render('index');
});

// trello route that will serve up an xml file
app.get('/trello-voice', function(request, response) {
  trello.getCardsOnList(myList, function(error, result) {
    console.log(result);
    var header = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    var footer = '</Response>';
    var lines = result.map(function(card) {
      return "<Say>" + card.name.encodeHTML() + "</Say>";
    });

    response.send(header + lines.join('') + footer);
  });
});

// route that will post to trello list
app.post('/trello-sms', function(request, response) {
  // add card to trello
  var creationSuccess = function(data) {
    console.log('Card created successfully. Data returned:' + JSON.stringify(data));
  };

  var newCard = {
    name: 'New Test Card',
    desc: 'This is the description of our new card.',
  // Place this card at the top of our list
    idList: myList,
    pos: 'top'
  };

  response.send(Trello.post('/cards/', newCard, creationSuccess));

  // trello.addCard('Clean car', 'Wax on, wax off', myList,
  //   function (error, trelloCard) {
  //       if (error) {
  //           console.log('Could not add card:', error);
  //       }
  //       else {
  //           console.log('Added card:', trelloCard);
  //           response.send(trelloCard);
  //       }
  //   });
});


// handle a POST request to send a text message.  This is sent via ajax on our
// home page
app.post('/message', function(request, response) {
    // Use the REST client to send a text message
    client.sendSms({
        to: request.param('to'),
        from: TWILIO_NUMBER,
        body: 'Have fun with your Twilio development!'
    }, function(err, data) {
        // When we get a response from Twilio, respond to the HTTP POST request
        response.send('Message is inbound!');
    });
});

// handle a POST request to make an outbound call.  This is sent via ajax on our
// home page
app.post('/call', function(request, response) {
    // Use the REST client to send a text message
    client.makeCall({
        to: request.param('to'),
        from: TWILIO_NUMBER,
        url: 'http://twilio-elearning.herokuapp.com/starter/voice.php'
    }, function(err, data) {
        // When we get a response from Twilio, respond to the HTTP POST request
        response.send('Call incoming!');
    });
});

// Create a TwiML document to provide instructions for an outbound call
app.get('/hello', function(request, response) {
    // Create a TwiML generator
    var twiml = new twilio.TwimlResponse();
    twiml.say('Hello there! You have successfully configured a web hook.');
    twiml.say('Have fun with your Twilio development!', {
        voice:'woman'
    });

    // Return an XML response to this request
    response.set('Content-Type','text/xml');
    response.send(twiml.toString());
});

// Start our express app, by default on port 3000
http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
});
