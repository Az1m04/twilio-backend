const config = require("./config");
const express = require("express");
const bodyParser = require("body-parser");
const { voiceToken , chatToken } = require("./tokens");
const { VoiceResponse } = require("twilio").twiml;
const cors = require("cors");
const app = express();
var onlineClients = []; //store available online clients
var onlineChatClients = []; //store available online clients
const accountSid =config.accountSid;
const authToken = config.authToken;
var meId=""
const client = require('twilio')(accountSid, authToken);

var allowedDomains = ["https://dev-01.speedum.tech", "http://localhost:3000"]; //allowed domains
app.use(
  cors({
    origin: function (origin, callback) {
      // bypass the requests with no origin (like curl requests, mobile apps, etc )
      if (!origin) return callback(null, true);

      if (allowedDomains.indexOf(origin) === -1) {
        var msg = `This site ${origin} does not have an access. Only specific domains are allowed to access it.`;
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
  })
);
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

app.post("/chat/token", (req, res) => {
  const identity = req.body.identity;
  const token = chatToken(identity, config);                      
  sendTokenResponse(token, res);
});


/***************** HANDLE OUTGOING CALL***************** */
/***********************STARTS******************************/
app.post("/voice", (req, res) => {
  const To = req.body.To;
  const response = new VoiceResponse();
  const dial = response.dial({ callerId: config.callerId });
  dial.number(To);
  res.set("Content-Type", "text/xml");
  res.send(response.toString());
});
/***********************ENDS******************************/



/***************** HANDLE CLIENT VOICE TOKEN ***************** */
/***********************STARTS******************************/
app.get("/voice/token", (req, res) => {
  const identity = req.query.identity; // online client identity
  onlineClients.push(identity);  //pushing it to available clients array
  const unique = [...new Set(onlineClients?.map((v) => v))]; //removing the duplicay of client online 
  onlineClients = unique;
  const token = voiceToken(identity, config); //Genrating token
  sendTokenResponse(token, res); //sending the token response
});
/***********************ENDS******************************/




/***************** HANDLE CLIENT CHAT TOKEN  ***************** */
/***********************STARTS******************************/
app.get("/chat/token", (req, res) => {
  const identity = req.query.identity; // online client identity
  const token = chatToken(identity ,config); //Genrating token

  sendTokenResponse(token ,res); //sending the token response
});
/***********************ENDS******************************/
app.get("/chat/users/id", (req, res) => {
  const identity = req.query.identity;

    client.conversations.v1.users.list({limit: 20}).then(user =>{ 
      const data=user.filter(u =>u?.identity===identity )[0]
      meId=data?.sid

     })

        client.conversations.v1.users(meId)
                       .update({
                          attributes: JSON.stringify({name:"azim"}),
                        })
                       .then(user =>  res.send({
                        users:user,
                        returnCode: "true",
                      }));
     
});


/***************** CHAT USERS ***************** */
/***********************STARTS******************************/
app.get("/chat/users", (req, res) => {
  client.conversations.v1.users.list({limit: 20})
  .then(user => res.send({
    users:user,
    returnCode: "true",
  }));
});
/***********************ENDS******************************/

/***************** CHAT USERS ***************** */
/***********************STARTS******************************/
app.get("/chat/messages", (req, res) => {
  const convSid=req?.query?.convSid
  const msgSid=req?.query?.msgSid
  client.conversations.v1.conversations(convSid)
  .messages(msgSid)
  .deliveryReceipts
  .list({limit: 20})
  .then(user => res.send({
    users:user,
    returnCode: "true",
  }));
});
/***********************ENDS******************************/



/***************** HANDLE CLIENT OFFLINE STATE ***************** */
/***********************STARTS******************************/
app.get("/chat/removetoken", (req, res) => {
  const identity = req.query.identity;  // offline client identity
  const arr = onlineChatClients?.filter((item) => { 
    return item !== identity; //removing the client id  from available clint array if client device is OFFLINE
  });
  onlineChatClients = arr;
  res.send({
    returnCode: "true",
  });
});
/***********************ENDS******************************/

/***************** HANDLE INCOMING CALL ***************** */
/***********************STARTS******************************/
app.post("/voice/incoming", (req, res) => {
  const response = new VoiceResponse();
  response.say({ voice: "alice" }, "Thank you for calling Health Vault.");
  response.pause({ length: 2 });

  //Gather input from the user
  const gatherValue = () => {
    const gather = response.gather({
      input: "dtmf",
      action: "/results",
      timeout: "auto",
    });
    const say = gather.say({ voice: "alice" });
    say.prosody(
      {
        rate: "x-slow", // voice speed
      },
      "Please dial the extension if you know or dial 0 to talk to our agent."
    );
  };

  gatherValue(); // gathering from user

  response.say("You have not daial any input. Please try again.");
  
  gatherValue();  // Retry gathering from user
  
  response.pause();
  
  response.say("Thanks for calling."); //IF not input then calls  end
  
  res.set("Content-Type", "text/xml");
  res.send(response.toString());
});
/***********************ENDS******************************/


/***************** HANDLE RESULTS OF GATHERD USERINPUT ***************** */
/***********************STARTS******************************/
app.post("/results", (req, res) => {
  const userInput = req.body.Digits;  // user input value
  const response = new VoiceResponse();

  const random = onlineClients[Math.floor(Math.random() * onlineClients.length)]; // Taking random available client
  const dial = response.dial({
    callerId: req.body.From,  // getting call from user
    answerOnBridge: true,
    timeout: 10, // dial timeout in seconds
    action: `/handleDialCallStatus?dialInput=${userInput}&clientId=${random}`,  // dial call action handler
  });
  const gatherValue = () => {
    const gather = response.gather({
      input: "dtmf",
      action: "/results",
      timeout: "auto",
    });
    const say = gather.say({ voice: "alice" });
    say.prosody(
      {
        rate: "x-slow",
      },
      "Please dial the extension if you know or dial 0 to talk to our agent."
    );
  };

  //Voicemail response callback
  const callFallback = () => {
    const gather = response.gather();
    gather.say(
      { voice: "alice" },
      "Sorry, no one is available to take your call. Please leave a message at the beep.\nPress the star key when finished."
    );
    response.record({
      action: "/voicemail",
      playBeep: true,
      finishOnKey: "*",
    });
  };



//Gather digit output results
  switch (req.body.Digits) {
    case "0":
      if (onlineClients?.includes(random)) {
        dial.client(random);
      } else {
        callFallback();
      }
      break;
    case "100":
      if (onlineClients?.includes("18")) {
          dial.client("18");
      } else {
        callFallback();
      }
      break;
      case "101":
        dial.conference('myconference', {
          startConferenceOnEnter: true,
          endConferenceOnExit: true,
          action:"/handleconference",
          statusCallbackEvent: 'start end join leave mute hold'
        });
        break;
    default:
      response.say("Sorry, I don't undersatand that choice.");
      response.say("Please try again.");
      response.pause({ length: 1 });
      gatherValue();
      break;
  }
  res.send(response.toString());
});
/***********************ENDS******************************/

/***************** HANDLE DIAL CALL BACK  ***************** */
/***********************STARTS******************************/
app.post("/handleDialCallStatus", (req, res) => {
  const clientIdFallback = req?.query?.clientId;    //client ID
  const callerIdFallback = req?.query?.dialInput;       // dialed input 
  const response = new VoiceResponse();
  
  const badStatusCodes = ["busy", "no-answer", "canceled", "failed"]; //Bad call cases

  if (!badStatusCodes.includes(req.body.DialCallStatus)) {
    return res.send(response.toString());
  }

  if (callerIdFallback <= 0) {
    response.say('Please hold the line.')
    response.redirect(`/handleRedirect?clientId=${clientIdFallback}`);   // redirect call if dialed input 0
  } else {
     // Record voicemail if client not available
    const gather = response.gather();
    gather.say(
      { voice: "alice" },
      "Sorry, no one is available to take your call. Please leave a message at the beep.\nPress the star key when finished."
    );
    response.record({
      action: "/voicemail",
      playBeep: true,
      finishOnKey: "*",
    });
  }

  res.set("Content-Type", "text/xml");
  res.send(response.toString());
});
/***********************ENDS******************************/



/***************** HANDLE REDIRECT CALL ***************** */
/***********************STARTS******************************/
app.post("/handleRedirect", (req, res) => {
  const callerIdFallback = req?.query?.clientId;  //Client Id who did not answer the call
  const response = new VoiceResponse();

  //Removeing the client whot did not answer the call from available list 
  const updateClient = onlineClients?.filter((item) => {
    return item !== callerIdFallback;
  });

  const dial = response.dial({
    callerId: req.body.From,
    answerOnBridge: true,
    timeout: 10,
    action:'/handleRedialDialCallStatus'
  });

  const random = updateClient[Math.floor(Math.random() * updateClient.length)]; // Taking random available client
  if (updateClient?.length > 0) {

    dial.client(random);    // Redial to available clients
  } else {
       // Record voicemail if client not available
    const gather = response.gather();
    gather.say(
      { voice: "alice" },
      "Sorry, no one is available to take your call. Please leave a message at the beep.\nPress the star key when finished."
    );
    response.record({
      action: "/voicemail",
      playBeep: true,
      finishOnKey: "*",
    });
  }
  res.send(response.toString());
});

/***********************ENDS******************************/


/***************** HANDLE CONFERENCE CALL BACK  ***************** */
/***********************STARTS******************************/
app.post("/handleconference", (req, res) => {
  console.log(">>>BODY",req.body)
  const response = new VoiceResponse();
  const dial = response.dial({
    callerId: req.body.From,
    answerOnBridge: true,
    timeout: 10,
  });
  dial.client('15')
  response.say('Thanks for calling.')

  res.set("Content-Type", "text/xml");
  res.send(response.toString());
});
/***********************ENDS******************************/

/***************** HANDLE DIAL CALL BACK  ***************** */
/***********************STARTS******************************/
app.post("/handleRedialDialCallStatus", (req, res) => {

  const response = new VoiceResponse();
  
  const badStatusCodes = ["busy", "no-answer", "canceled", "failed"]; //Bad call cases

  if (!badStatusCodes.includes(req.body.DialCallStatus)) {
    return res.send(response.toString());
  }

  response.say('Thanks for calling.')
  res.set("Content-Type", "text/xml");
  res.send(response.toString());
});
/***********************ENDS******************************/


// /***************** GET CALL RECORDINGS LOGS ***************** */
// /***********************STARTS******************************/
// app.get("/getRecordings", (req, res) => {
//   client.recordings
//   .list({limit: 20})
//   .then(recordings => 
//     res.json({
//       success: true,
//       message: "fetched successfully",
//       recordings
//     }));
// });
// /***********************ENDS******************************/

// /***************** GET CALL LOGS ***************** */
// /***********************STARTS******************************/
// app.get("/callLogs", (req, res) => {
//   client.calls
//   .list({limit: 20})
//   .then(call => 
//     res.json({
//       success: true,
//       message: "fetched successfully",
//       call
//     }));
// });
// /***********************ENDS******************************/

/***************** HANDLE VOICEMAIL ***************** */
/***********************STARTS******************************/

app.all("/voicemail", (req, res) => {
  const response = new VoiceResponse();
  client.recordings
  .list({callSid: req.body.callSid, limit: 20})
  .then(recordings => recordings.forEach(r => console.log(r.sid)));
  response.say("Thank you for your message. Good bye.");  // recieved voice response message
  response.hangup();
  res.send(response.toString());
});

/***********************ENDS******************************/

const port = process.env.PORT || 8888;   //SET the server port

app.listen(port, () =>
  console.log(`Express server is running on localhost:${port}`)
);
