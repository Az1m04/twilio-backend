const config = require("./config");
const express = require("express");
const bodyParser = require("body-parser");
const { voiceToken } = require("./tokens");
const { VoiceResponse } = require("twilio").twiml;
const cors = require("cors");
const app = express();


var allowedDomains = ['https://dev-01.speedum.tech', 'http://localhost:3000'];
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
  const token = voiceToken(identity, config);
  sendTokenResponse(token, res);
});

app.post("/voice/incoming", (req, res) => {
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
  const dial = response.dial({ callerId: req.body.From, answerOnBridge: true,timeout:10 ,   action: '/handleDialCallStatus',
  method: 'POST'});
 switch (req.body.Digits){
   case '0':

    dial.client('15')
    // response.say('"Sorry, no one is available to take your call. Please leave a message at the beep.\nPress the star key when finished.');
    // response.record({
    //     action: "/voicemail",
    //     playBeep: true,
    //     finishOnKey: '*'
    // });
    // response.say('I did not receive a recording');

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
  res.send(response.toString())
});

app.post("/handleDialCallStatus", (req, res) => {
  console.log(req.body.CallStatus,"STATUS>>>")
  const response = new VoiceResponse();
  switch(req.body.CallStatus){
    case 'no-answer':
        response.say('"Sorry, no one is available to take your call. Please leave a message at the beep.\nPress the star key when finished.');
    response.record({
        action: "/voicemail",
        playBeep: true,
        finishOnKey: '*'
    });
    response.say('I did not receive a recording');
      default:
        break;
  }
  res.send(response.toString())
});

app.all("/voicemail",(req,res)=>{
  console.log(req.body,">>?")
  const response = new VoiceResponse();
  response.say("Thank you for your message. Good bye.");
  response.hangup();
  res.send(response.toString())
})

const port = process.env.PORT || 8888;

app.listen(port, () =>
  console.log(`Express server is running on localhost:${port}`)
);
