// js xml escape
if (!String.prototype.encodeHTML) {
  String.prototype.encodeHTML = function () {
    return this.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;');
              //  .replace(/'/g, '&apos;');
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

app.post('/voice', (req, res) => {
  // Set the url of the song we are going to play
  let songUrl = 'http://ocrmirror.org/files/music/remixes/Street_Fighter_2_Guile%27s_Theme_Goes_with_Metal_OC_ReMix.mp3'

  // Generate a TwiML response
  let twiml = new twilio.TwimlResponse();

  // Play Guile's theme over the phone.
  twiml.play(songUrl);

  // Set the response type as XML.
  res.header('Content-Type', 'text/xml');

  // Send the TwiML as the response.
  res.send(twiml.toString());

});

// trello route that will serve up an xml file
app.get('/trello-voice', function(request, response) {
  trello.getCardsOnList(myList, function(error, result) {
    console.log(result);
    var header = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    var footer = '</Response>';
    var lines = result.map(function(card) {
      return "<Say voice='man'>" + card.name.encodeHTML() + "</Say>";
    });

    response.send(header + lines.join('') + footer);
  });
});

// route that will post to trello list
app.post('/trello-sms', function(request, response) {
  // todo: retrieve sms body and pass it into addCard()

  // add card to trello
  trello.addCard('Working?', myList,
    function (error, trelloCard) {
        if (error) {
            console.log('Could not add card:', error);
        }
        else {
            console.log('Added card:', trelloCard);
            response.send(trelloCard);
        }
    });
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
