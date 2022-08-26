const config = require("./config");
const express = require("express");
const bodyParser = require("body-parser");
const { voiceToken } = require("./tokens");
const { VoiceResponse } = require("twilio").twiml;
const cors = require("cors");
const app = express();
var onlineClients=[];

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
   onlineClients.push(identity)
   const unique= [...new Set(onlineClients?.map(v=>v))]
   onlineClients=unique
   console.log(onlineClients,"UNIQUE")

  const token = voiceToken(identity, config);
  sendTokenResponse(token, res);
});

app.get("/voice/removetoken", (req, res) => {
  const identity = req.query.identity;
  const arr = arr.filter((item)=> {
    return item !== identity
   })
  onlineClients=arr
  console.log(onlineClients,"UPDATED")
  res.send({
    returnCode: "true"
  })
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
  const say=gather.say({ voice: 'alice' })
  say.prosody({
    rate: 'x-slow',
}, "Please dial the extension if you know or dial 0 to talk to our agent.");
  res.set("Content-Type", "text/xml");
  res.send(response.toString());
});



app.post("/results", (req, res) => {
  const userInput = req.body.Digits;
  const response = new VoiceResponse();
  const dial = response.dial({ callerId: req.body.From, answerOnBridge: true,timeout:10,
  method: 'POST'});
 switch (req.body.Digits){
   case '0':
    console.log(onlineClients,"onlineClients")
      if(onlineClients?.includes('15')){
        dial.client('15')
     }
     else {
      const gather=response.gather()
      gather.say({ voice: 'alice' },"Sorry, no one is available to take your call. Please leave a message at the beep.\nPress the star key when finished.")
      response.record({
        action: "/voicemail",
        playBeep: true,
        finishOnKey: '*'
       });
     }
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
  // console.log(req.body.CallStatus,"STATUS>>>")
  const response = new VoiceResponse();
  const badStatusCodes=["busy",
  "no-answer",
  "canceled",
  // "in-progress",
  "failed"]
  if (!badStatusCodes.includes(req.body.CallStatus))
  { 
   return  res.send(response.toString())
  }

  res.set("Content-Type", "text/xml");
  res.send(response.toString())
});


app.all("/voicemail",(req,res)=>{
  const response = new VoiceResponse();
  response.say("Thank you for your message. Good bye.");
  response.hangup();
  res.send(response.toString())
})

const port = process.env.PORT || 8888;

app.listen(port, () =>
  console.log(`Express server is running on localhost:${port}`)
);
