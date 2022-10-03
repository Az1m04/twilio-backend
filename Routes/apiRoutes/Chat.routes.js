const router = require("express").Router();
const config = require("../../config");
const { chatToken } = require("../../tokens");
const accountSid = config.accountSid;
const authToken = config.authToken;
const client = require("twilio")(accountSid, authToken);

var meId = "";


const sendTokenResponse = (token, res) => {
    res.set("Content-Type", "application/json");
    res.send(
      JSON.stringify({
        token: token.toJwt(),
      })
    );
  };
  

router.post("/token", (req, res) => {
    const identity = req.body.identity;
    const token = chatToken(identity, config);
    sendTokenResponse(token, res);
  });

  

  
/***************** HANDLE CLIENT CHAT TOKEN  ***************** */
/***********************STARTS******************************/
router.get("/token", (req, res) => {
    try{
     const identity = req.query.identity; // online client identity
     const token = chatToken(identity, config); //Genrating token
   
     sendTokenResponse(token, res); //sending the token response
    }
    catch (e) {
     res.send({
       message: e?.message,
   
       returnCode: "error",
     });
    }
   });
/***********************ENDS******************************/


/***************** HANDLE CHAT USER UPDATE  ***************** */
/***********************STARTS******************************/
router.post("/updateUser/:id", async (req, res) => {
    const identity = req.params.id;
    const attributes = req.body.attributes;
    const friendlyName = req.body.friendlyName;
  
    await client.conversations.v1.users.list({ limit: 20 }).then((user) => {
      const data = user?.filter((u) => u?.identity === identity)[0];
      meId = data?.sid;
    });
  
    await client.conversations.v1
      .users(meId)
      .update({
        friendlyName: friendlyName,
        attributes: JSON.stringify(attributes),
      })
      .then((user) => {
        meId = "";
        res.send({
          users: user,
          meId,
          returnCode: "true",
        });
      });
  });
  
  /***********************END******************************/
  
  /***************** HANDLE SINGLE CHAT PARTICIPENT UPDATE  ***************** */
  /***********************STARTS******************************/
  router.post("/updateSingleParti", async (req, res) => {
    const partiSid = req.body.partiSid;
    const convoSid = req.body.convoSid;
    const attributes = req.body.attributes;
  
  
      await client.conversations.v1
        .conversations(convoSid)
        .participants(partiSid)
        .update({
          attributes: JSON.stringify(attributes),
    });
    res.send({
   
      returnCode: "true",
    })
  
  });
  
  /***********************END******************************/
  
  /***************** HANDLE CHAT  CONVERSATIONS ***************** */
  /***********************STARTS******************************/
  router.post("/updateConvo", async (req, res) => {
    const sids = req.body.sid;
    const attributes = req.body.attributes;
  
    sids.forEach(async (v) => {
      const [convoSid, partiSid] = v?.split("~");
      await client.conversations.v1
        .conversations(convoSid)
        .participants(partiSid)
        .update({
          attributes: JSON.stringify(attributes),
        });
    });
    res.send({
   
      returnCode: "true",
    })
  
  });
  
  /***********************END******************************/
  
  
  /***************** GET CHAT USERS LIST ***************** */
  /***********************STARTS******************************/
  router.get("/users", (req, res) => {
    client.conversations.v1.users.list({ limit: 20 }).then((user) =>
      res.send({
        users: user,
        returnCode: "true",
      })
    );
  });
  /***********************ENDS******************************/
  
  
  /***************** CHAT MESSAGES ***************** */
  /***********************STARTS******************************/
  router.get("/messages", (req, res) => {
    const convSid = req?.query?.convSid;
    const msgSid = req?.query?.msgSid;
    client.conversations.v1
      .conversations(convSid)
      .messages(msgSid)
      .deliveryReceipts.list({ limit: 20 })
      .then((user) =>
        res.send({
          users: user,
          returnCode: "true",
        })
      );
  });
  
  /***********************ENDS******************************/
  