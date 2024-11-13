const backendUrl = "https://bzjj7l.buildship.run/AWSAgent"; // Your backend URL
let thread_id = Math.random().toString(36).substring(7); // Generate a random thread ID
const chatList = []; // Array to store chat sessions
const chatMessages = {}; // Object to store messages for each thread_id

const messagesContainer = document.getElementById("messages");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const chatItems = document.getElementById("chat-items");
const newChatBtn = document.getElementById("new-chat-btn");

// Function to add a message to the chat UI and store it
function addMessage(content, isUser) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${isUser ? "user-message" : "assistant-message"}`;
    
    const messageContent = document.createElement("div");
    messageContent.className = "message-content";

    if (!isUser) {
        const formattedContent = content
            .replace(/\n/g, "<br>")
            .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;")
            .replace(/(\d+)\./g, "<br><strong>$1.</strong>")
            .replace(/   - /g, "&nbsp;&nbsp;&nbsp;&nbsp;- ")
            .replace(/(\b[a-c]\.\b)/g, "<br>&nbsp;&nbsp;&nbsp;<strong>$1</strong>");
        messageContent.innerHTML = formattedContent;
    } else {
        messageContent.textContent = content;
    }

    messageDiv.appendChild(messageContent);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    if (!chatMessages[thread_id]) {
        chatMessages[thread_id] = [];
    }
    chatMessages[thread_id].push({ content, isUser });
}

// Function to display all messages for a given chat session
function displayChatMessages(threadId) {
    messagesContainer.innerHTML = ""; // Clear current messages
    const messages = chatMessages[threadId] || []; // Get messages for the specified thread_id

    // Display each message
    messages.forEach(message => {
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${message.isUser ? "user-message" : "assistant-message"}`;
        if (message.isUser) {
            messageDiv.textContent = message.content;
        } else {
            const formattedContent = message.content
                .replace(/\n/g, "<br>")
                .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;")
                .replace(/(\d+)\./g, "<br><strong>$1.</strong>")
                .replace(/   - /g, "&nbsp;&nbsp;&nbsp;&nbsp;- ")
                .replace(/(\b[a-c]\.\b)/g, "<br>&nbsp;&nbsp;&nbsp;<strong>$1</strong>");
            messageDiv.innerHTML = formattedContent;
        }
        messagesContainer.appendChild(messageDiv);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Function to create a new chat session in the list
function addChatSession(threadId) {
    const chatItem = document.createElement("li");
    chatItem.innerHTML = `
        <i class="fas fa-message"></i>
        <span>Chat ${threadId.substring(0, 5)}</span>
    `;
    
    chatItem.addEventListener("click", () => {
        // Remove active class from all items
        document.querySelectorAll('#chat-items li').forEach(item => {
            item.classList.remove('active');
        });
        // Add active class to clicked item
        chatItem.classList.add('active');
        loadChat(threadId);
    });
    
    // Make first chat active by default
    if (chatList.length === 0) {
        chatItem.classList.add('active');
    }
    
    chatItems.appendChild(chatItem);
    chatList.push(threadId);
}

// Function to start a new chat
function startNewChat() {
    thread_id = Math.random().toString(36).substring(7); // Generate a new thread ID
    console.log("Starting new chat with thread ID:", thread_id);
    messagesContainer.innerHTML = ""; // Clear the chat messages
    addMessage(`New chat started: ${thread_id}`, false); // Placeholder message
    addChatSession(thread_id); // Add to chat list
}

// Function to load a specific chat's messages
function loadChat(selectedThreadId) {
    console.log("Loading chat:", selectedThreadId);
    thread_id = selectedThreadId; // Set the current thread_id to the selected one
    displayChatMessages(thread_id); // Display stored messages for this chat
}

// Initialize first chat session
addChatSession(thread_id);

// Send message to backend
async function sendMessage(message) {
    addMessage(message, true); // Display user message
    userInput.value = ""; // Clear input

    console.log("Sending message:", message); // Log the message being sent
    console.log("Thread ID:", thread_id); // Log the thread ID
    console.log("Sending POST request to:", backendUrl); // Log the backend URL

    try {
        const response = await fetch(backendUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: message,
                thread_id: thread_id
            })
        });

        console.log("Response status:", response.status); // Log the response status

        if (!response.ok) {
            console.error("Failed to get a valid response from the backend:", response.status, response.statusText);
            addMessage("Error: Unable to reach assistant.", false);
            return;
        }

        const data = await response.json();
        console.log("Response data:", data); // Log the data received from the backend

        addMessage(data.message || "No response from assistant.", false);
    } catch (error) {
        console.error("Fetch error:", error); // Log any error during the fetch
        addMessage("Error: Unable to reach assistant.", false);
    }
}

// Event listeners
sendBtn.addEventListener("click", () => {
    if (userInput.value.trim()) {
        sendMessage(userInput.value.trim());
    }
});

userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && userInput.value.trim()) {
        sendMessage(userInput.value.trim());
    }
});

// New chat button event listener
newChatBtn.addEventListener("click", startNewChat);
