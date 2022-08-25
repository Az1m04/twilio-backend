const config = require("./config");
const express = require("express");
const bodyParser = require("body-parser");
const { voiceToken } = require("./tokens");
const { VoiceResponse } = require("twilio").twiml;
const cors = require("cors");
const app = express();


var allowedDomains = ['https://dev-01.speedum.tech', 'http://localhost:3000'];
var ID="";
app.use(cors({
  origin: function (origin, callback) {
    // bypass the requests with no origin (like curl requests, mobile apps, etc )
    if (!origin) return callback(null, true);
 
    if (allowedDomains.indexOf(origin) === -1) {
      var msg = `This site ${origin} does not have an access. Only specific domains are allowed to access it.`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const sendTokenResponse = (token, res) => {
  res.set("Content-Type", "application/json");
  res.send(
    JSON.stringify({
      token: token.toJwt(),
    })
  );
};

app.post("/voice/token", (req, res) => {
  const identity = req.body.identity;

  const token = voiceToken(identity, config);
  sendTokenResponse(token, res);
});

app.post("/voice", (req, res) => {
  // console.log('VOICE>>>>',req)
  const To = req.body.To;
  const response = new VoiceResponse();
  const dial = response.dial({ callerId: config.callerId });
  dial.number(To);
  res.set("Content-Type", "text/xml");
  res.send(response.toString());
});

app.get("/voice/token", (req, res) => {
  const identity = req.query.identity;
  ID=identity;
  const token = voiceToken(identity, config);
  sendTokenResponse(token, res);
});

app.post("/voice/incoming", (req, res) => {
  console.log(  ID,">>> ID",req.body.identity,">>>> INDETIDY")
  const response = new VoiceResponse();
  response.say({voice:'alice'},"Thank you for calling Health Vault.")
  response.pause({length:2})
const gather=response.gather({
  input:'dtmf',
  action:'/results',
  timeout: 'auto',
})
  gather.say({ voice: 'alice' },"Please dial the extension if you know or dial 0 to talk to our agent.")
  res.set("Content-Type", "text/xml");
  res.send(response.toString());
});

app.post("/results", (req, res) => {
  const userInput = req.body.Digits;
  const response = new VoiceResponse();
  const dial = response.dial({ callerId: req.body.From, answerOnBridge: true });
 switch (req.body.Digits){
   case '0':
     dial.client(
      { 
        statusCallback: '/calls/events',
        statusCallbackMethod: 'POST'
      } 
  ,ID)

     break;
     case '100':
      dial.client('17');
      break;
    
   default:
      response.say("Sorry, I don't undersatand that choice.");
    break;
}
res.send(response.toString());
});


app.post("/calls/events", (req, res) => {
  const response = new VoiceResponse();
  console.log(req.body,"req")
  switch (req.body.CallStatus){
    case 'no-answer':
      response.say("Thanks for reaching us. Currently no agents available.")
      break;
      case 'busy':
        response.say("Lines are busy.")
       break;
    default:
       response.say("We are currently offilne.");
     break;
 }
res.send(response.toString());
});

const port = process.env.PORT || 8888;

app.listen(port, () =>
  console.log(`Express server is running on localhost:${port}`)
);
