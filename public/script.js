const sendBtn = document.querySelector("#send-btn");
const messagesContainer = document.querySelector("#messages");
let conversationHistory = [];
const participantID = localStorage.getItem('participantID');


// NEW SHIT START
const player1Select = document.querySelector("#player1-select");
const player2Select = document.querySelector("#player2-select");
const startDateInput = document.querySelector("#start-date");
const endDateInput = document.querySelector("#end-date");
const chartTypeRadios = document.getElementsByName("chart-type");
const goalsCheckbox = document.querySelector("#goals");
const assistsCheckbox = document.querySelector("#assists");


// Alert and prompt if no participantID
if (!participantID) {
    alert('Please enter a participant ID.');
    // Redirect to login if no participantID is set
    window.location.href = '/';
}


const sendMessage = async (event) => {
    // Log selected chart type (radio buttons)
    let formatNum = null;
    let selectedChartType = null;
    for (const radio of chartTypeRadios) {
        if (radio.checked) {
            selectedChartType = radio.value;
            if (selectedChartType === "bar") { // bar
                if (goalsCheckbox.checked && assistsCheckbox.checked) {
                    formatNum = 1;
                } else if (goalsCheckbox.checked) {
                    formatNum = 2;
                } else if (assistsCheckbox.checked) {
                    formatNum = 3;
                }
            } else { // line
                if (goalsCheckbox.checked && assistsCheckbox.checked) {
                    formatNum = 4;
                } else if (goalsCheckbox.checked) {
                    formatNum = 5;
                } else if (assistsCheckbox.checked) {
                    formatNum = 6;
                }
            }
            break;
         }
    }



    const messageData = {
        message: `Compare the two following players: ${player1Select.value} and ${player2Select.value} from ${startDateInput.value} to ${endDateInput.value}. Return the format for a ${selectedChartType} chart with ${goalsCheckbox.checked ? 'goals' : ''} ${goalsCheckbox.checked && assistsCheckbox.checked ? 'and' : ''} ${assistsCheckbox.checked ? 'assists' : ''}. ${formatNum ? `The number of the specific format you must return is ${formatNum} - do not deviate from that format WHATSOEVER.` : ''}`
    };
    
    messagesContainer.innerHTML += `<p><strong>User:</strong> ${messageData.message}</p>`;

    const payload = conversationHistory.length === 0
    ? { input: messageData.message, id: participantID} // First submission, send only input
    : { history: conversationHistory, input: messageData.message, id: participantID};

    const response = await fetch('/submit_form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    // add user input and bot response to the conversation history
    const data = await response.json();

    if (data.searchResults && data.searchResults.length > 0) {
        messagesContainer.innerHTML += `<p><strong>Search Results:</strong></p>`;
        const searchResultsDiv = document.createElement('div');
        data.searchResults.forEach(result => {
            const resultDiv = document.createElement('div');
            resultDiv.innerHTML = `<a href="${result.url}"
            target="_blank">${result.title}</a><p>${result.snippet}</p>`;
            searchResultsDiv.appendChild(resultDiv);
        });
        messagesContainer.appendChild(searchResultsDiv);
    }

    console.log(data.botResponse)
    const results = data.botResponse.split("&&");
    console.log(results)
    const chartData = results[1].split("\n");
    console.log(chartData);
        


    conversationHistory.push({ role: 'user', content: messageData.message });
    conversationHistory.push({ role: 'assistant', content: data.botResponse});
    messagesContainer.innerHTML += `<p><strong>Bot:</strong> ${data.botResponse}</p>`;
    messagesContainer.innerHTML += `\n-----------------------------------------------------------\n`;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

sendBtn.addEventListener("click", function () {
    sendMessage();
});


// inputField.addEventListener('focus', () => {
//     logEvent('focus', 'User Input');
// });

// inputField. addEventListener('mouseover', () => {
//     logEvent('hover', 'User Input');
// });

function logEvent(type, element) {
    fetch('/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            eventType: type, 
            elementName: element, 
            timestamp: new Date(),
            participantID 
        })
    });
}

// Function to fetch and load existing conversation history
async function loadConversationHistory() {
    const response = await fetch('/history', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ participantID }) // Send participantID to the server
    });
    const data = await response.json();
    if (data.interactions && data.interactions.length > 0) {
        data.interactions.forEach(interaction => {
            const userMessageDiv = document.createElement('div');
            userMessageDiv.innerHTML = `<strong>You</strong>: ${interaction.userInput}`;
            messagesContainer.appendChild(userMessageDiv);
            const botMessageDiv = document.createElement('div');
            botMessageDiv.innerHTML = `<p><strong>Bot</strong>: ${interaction.botResponse}<br><br>---------------------<br></p>`;
            messagesContainer.appendChild(botMessageDiv);
            // Add to conversation history
            conversationHistory.push({ role: 'user', content: interaction.userInput });
            conversationHistory.push({ role: 'assistant', content: interaction.botResponse });
            });
        }
    }
    // Load history when agent loads
    window.onload = loadConversationHistory;
    