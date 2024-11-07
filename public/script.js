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
    window.location.href = '/';
}

const sendMessage = async (event) => {
    let formatNum = null;
    let selectedChartType = null;
    for (const radio of chartTypeRadios) {
        if (radio.checked) {
            selectedChartType = radio.value;
            if (selectedChartType === "bar") {
                if (goalsCheckbox.checked && assistsCheckbox.checked) {
                    formatNum = 1;
                } else if (goalsCheckbox.checked) {
                    formatNum = 2;
                } else if (assistsCheckbox.checked) {
                    formatNum = 3;
                }
            } else {
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
    ? { input: messageData.message, id: participantID}
    : { history: conversationHistory, input: messageData.message, id: participantID};

    const response = await fetch('/submit_form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.searchResults && data.searchResults.length > 0) {
        messagesContainer.innerHTML += `<p><strong>Search Results:</strong></p>`;
        const searchResultsDiv = document.createElement('div');
        data.searchResults.forEach(result => {
            const resultDiv = document.createElement('div');
            resultDiv.innerHTML = `<a href="${result.url}" target="_blank">${result.title}</a><p>${result.snippet}</p>`;
            searchResultsDiv.appendChild(resultDiv);
        });
        messagesContainer.appendChild(searchResultsDiv);
    }

    console.log(data.botResponse);
    const results = data.botResponse.split("&&");
    console.log(results);
    const chartData = results[1].split("\n").slice(1, -1); // Remove first and last element
    console.log(chartData);

    // Prepare data for D3
    const parsedData = chartData.map(d => {
        const [label, value] = d.split("%");
        return { label: label, value: +value };
    });

    // Create the chart using D3.js
    createChart(parsedData);

    conversationHistory.push({ role: 'user', content: messageData.message });
    conversationHistory.push({ role: 'assistant', content: data.botResponse });
    messagesContainer.innerHTML += `<p><strong>Bot:</strong> ${data.botResponse}</p>`;
    messagesContainer.innerHTML += `\n-----------------------------------------------------------\n`;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

sendBtn.addEventListener("click", function () {
    sendMessage();
});

function createChart(data) {
    // Clear any existing chart
    d3.select("#chart").selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const width = 500 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(data.map(d => d.label))
        .range([0, width])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.value)])
        .nice()
        .range([height, 0]);

    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .call(d3.axisLeft(y));

    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.label))
        .attr("y", d => y(d.value))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.value))
        .attr("fill", "steelblue");
}

// Load conversation history when the page loads
window.onload = loadConversationHistory;
