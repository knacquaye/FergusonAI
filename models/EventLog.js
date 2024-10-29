const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const EventLogSchema = new Schema({
    eventType: String, // Type of event (click, hover, focus)
    elementName: String, // Name of the element (e.g., Send Button)
    timestamp: { 
        type: Date, 
        default: Date.now },
    participantID: String
    });
module.exports = mongoose.model('EventLog', EventLogSchema);
