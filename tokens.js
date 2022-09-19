const twilio = require("twilio");
const AccessToken = twilio.jwt.AccessToken;
const { VoiceGrant,ChatGrant } = AccessToken;

const generateToken = (config) => {
  return new AccessToken(config.accountSid, config.apiKey, config.apiSecret);
};

const voiceToken = (identity, config) => {
  let voiceGrant;
  if (typeof config.twimlAppSid !== "undefined") {
    voiceGrant = new VoiceGrant({
      outgoingApplicationSid: config.twimlAppSid,
      incomingAllow: config.incomingAllow,
    });
  } else {
    voiceGrant = new VoiceGrant({
      incomingAllow: config.incomingAllow,
    });
  }
  const token = generateToken(config);
  token.addGrant(voiceGrant);
  token.identity = identity;
  return token;
};

module.exports = { voiceToken };


const generateToken = () => {
  return new AccessToken(
    config.accountSid,
    config.chatApiKey,
    config.chatApiSecret
  );
};

const chatToken = (identity) => {
  let chatGrant;
  chatGrant = new ChatGrant({
    serviceSid: config.chatServiceSid
  });
  const token = generateToken()
  token.addGrant(chatGrant);
  token.identity = identity;
  return token;
};

module.exports =  {chatToken}