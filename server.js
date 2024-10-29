const express = require("express")
const path = require("path")
const bodyParser = require("body-parser")
require('dotenv').config();
console.log(`Loaded MONGO_URI: ${process.env.MONGO_URI}`);  
const Interaction = require('./models/Interaction');
const EventLog = require('./models/EventLog');
const { OpenAI } = require('openai'); 
const axios = require('axios');



// express app
const app = express();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// TODO: serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// 3. Middleware to parse JSON data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});


// TODO: create route to serve the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.post('/submit_form', async (req, res) => {


// 1. Receive user input from client script.


  const { history = [], input: userInput, id: participantID } = req.body; // Default history
  if (!participantID) {
    return res.status(400).send('Participant ID is required');
  }
  // ternary operator to check if first user input (i.e., if history exists)
  const messages = history.length === 0 ? [{ role: 'system', content: 'You are a helpful assistant.' }, {
  role: 'user', content: userInput }]  : [{ role: 'system', content: 'You are a helpful assistant.' }, ...history, { role: 'user', content: userInput }];
  
  const bingResponse = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
    params: { q: userInput }, // Use the user's input as the search query
    headers: {
    'Ocp-Apim-Subscription-Key': process.env.BING_API_KEY
    }
  });

  const searchResults = bingResponse.data.webPages.value.slice(0, 3).map(result => ({
    title: result.name,
    url: result.url,
    snippet: result.snippet
  }));



    try {
    // Call OpenAI API to generate a response based on user input
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Specify the OpenAI model
        messages: messages, // Send user input
        max_tokens: 500, // Limit the length of the generated response
      });
    // Extract and trim the chatbot's response
    const botResponse = response.choices[0].message.content.trim();
    // Log the interaction to MongoDB
    const interaction = new Interaction({
      userInput: userInput,
      botResponse: botResponse,
      participantID: participantID
    });

    await interaction.save(); // Save the interaction to MongoDB
    // Send the chatbot's response back to the client
    res.json({ botResponse, searchResults });
      
    } catch (error) {
      console.error('Error interacting with OpenAI API:', error.message); // Log error
      res.status(500).send('Server Error');
    }
    // old stuff
});

app.post('/log-event', async (req, res) => {
  const { eventType, elementName, timestamp, participantID } = req.body;
  // Check for participantID
  if (!participantID) {
    return res.status(400).send('Participant ID is required');
  }
  try {
    // Save the event to MongoDB
    // Add participantID
    const event = new EventLog({ eventType, elementName, timestamp, participantID });
    await event.save();
    res.status(200).send('Event logged successfully');
  } catch (error) {
    console.error('Error logging event:', error.message);
    res.status(500).send('Server Error');
  }
});
        
// Define a POST route for retrieving chat history by participantID
// POST route to fetch conversation history by participantID
app.post('/history', async (req, res) => {
  const { participantID } = req.body; // Get participant ID
  if (!participantID) {
    return res.status(400).send('Participant ID is required');
  }
  try {
    // Fetch all interactions from the database for the given participantID
    const interactions = await Interaction.find({ participantID }).sort({
    timestamp: 1 });
    // Send the conversation history back to the client
    res.json({ interactions });
  } catch (error) {
    console.error('Error fetching conversation history:', error.message);
    res.status(500).send('Server Error');
  }
});
  

// 7. Start the server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

  