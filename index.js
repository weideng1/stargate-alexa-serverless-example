const assert = require("assert");
const faker = require("faker");
const stargate = require("./stargate");
const _ = require("lodash");
const Alexa = require('ask-sdk-core');

// setup envars
require("dotenv").config();

// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speakOutput = 'Hello! I am your intelligent freezer who can help you track all of your frozen food. Do you want to add any item to the freezer?';
    const repromptText = 'Or you can say add an item packaged on what day with price of how much, do I have any item, or list all of my items';
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(repromptText)
      .getResponse();
  }
};

const AddItemIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AddItemIntent';
  },
  handle(handlerInput) {
    const item_name = handlerInput.requestEnvelope.request.intent.slots.item_name.value;
    const item_price = handlerInput.requestEnvelope.request.intent.slots.item_price.value;

    // setup test context
    let stargateClient = null;
    const namespace = process.env.ASTRA_KEYSPACE;
    const collection = "freezer";
    const docRootPath = `/namespaces/${namespace}/collections/${collection}`;

    (async () => {
      stargateClient = await stargate.createClient({
        baseUrl: `https://${process.env.ASTRA_DB_ID}-${process.env.ASTRA_DB_REGION}.apps.astra.datastax.com`,
        username: process.env.STARGATE_USERNAME,
        password: process.env.STARGATE_PASSWORD,
      });

      (async () => {
        await stargateClient.post(`${docRootPath}`, {
          "date_added": "2020-09-11",
          "name": item_name,
          "price": item_price,
          "quantity": 1,
          "state": "normal"
        });
      })();
    })();

    const speakOutput = `I'll add ${item_name} with a price of ${item_price} to your freezer.`;
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  }
};

const FindItemIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'FindItemIntent';
  },
  handle(handlerInput) {
    const item_name = handlerInput.requestEnvelope.request.intent.slots.food_item_name.value;

    // setup test context
    let stargateClient = null;
    const namespace = process.env.ASTRA_KEYSPACE;
    const collection = "freezer";
    const docRootPath = `/namespaces/${namespace}/collections/${collection}`;
    
    let search_result = null;
    let results = [];

    (async () => {
      stargateClient = await stargate.createClient({
        baseUrl: `https://${process.env.ASTRA_DB_ID}-${process.env.ASTRA_DB_REGION}.apps.astra.datastax.com`,
        username: process.env.STARGATE_USERNAME,
        password: process.env.STARGATE_PASSWORD,
      });

      (async () => {
        search_result = await stargateClient.get(`${docRootPath}/?where={"name": {"$eq": "${item_name}"}}`);
        let search_result_keys = Object.keys(search_result.jsonResponse.data);
        if (search_result_keys.length > 0) {
          search_result_keys.forEach(key => {
            console.log(`key=` + key);
            (async () => {
              let keyed_item = await stargateClient.get(`${docRootPath}/${key}`);
              results.push(keyed_item.jsonResponse.data);
            })();
         });
        }
      })();
      console.log(`results.length=` + results.length);
    })();

    const speakOutput = `Looking for ${item_name} in your freezer, please wait.`;
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  }
};

const GetAllItemIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'GetAllItemIntent';
  },
  handle(handlerInput) {
    // setup test context
    let stargateClient = null;
    const namespace = process.env.ASTRA_KEYSPACE;
    const collection = "freezer";
    const docRootPath = `/namespaces/${namespace}/collections/${collection}`;
    
    let result = null;

    (async () => {
      stargateClient = await stargate.createClient({
        baseUrl: `https://${process.env.ASTRA_DB_ID}-${process.env.ASTRA_DB_REGION}.apps.astra.datastax.com`,
        username: process.env.STARGATE_USERNAME,
        password: process.env.STARGATE_PASSWORD,
      });

      (async () => {
        result = await stargateClient.get(`${docRootPath}/?where={"name": { "$exists": true }}`);
      })();
    })();
      
    const speakOutput = `Here are all items I could find in your freezer:`;
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  }
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speakOutput = 'You can say add an item with price of how much, do I have any item, or list all of my items';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }
};
const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speakOutput = 'Goodbye!';
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  }
};
const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    // Any cleanup logic goes here.
    return handlerInput.responseBuilder.getResponse();
  }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest';
  },
  handle(handlerInput) {
    const intentName = handlerInput.requestEnvelope.request.intent.name;
    const speakOutput = `You just triggered ${intentName}`;

    return handlerInput.responseBuilder
      .speak(speakOutput)
      //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
      .getResponse();
  }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`~~~~ Error handled: ${error.message}`);
    const speakOutput = `Sorry, I couldn't understand what you said. Please try again.`;

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }
};


// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    GetAllItemIntentHandler,
    AddItemIntentHandler,
    FindItemIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler) // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
  .addErrorHandlers(
    ErrorHandler)
  .lambda();
