// First, load data from localStorage
let thread_id = localStorage.getItem('currentThreadId');
let chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
let chatMessages = JSON.parse(localStorage.getItem('chatMessages') || '{}');

// If there's no thread_id or chat history, initialize with a new chat
if (!thread_id || chatHistory.length === 0) {
    thread_id = Math.random().toString(36).substring(7);
    chatHistory = [thread_id];
    chatMessages = { [thread_id]: [] };
    // Save initial state
    localStorage.setItem('currentThreadId', thread_id);
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
    // Display welcome message for new users
    displayWelcomeMessage();
}

const backendUrl = "https://bzjj7l.buildship.run/AWSAgent";

// Get DOM elements
const messagesContainer = document.getElementById("messages");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const chatItems = document.getElementById("chat-items");
const newChatBtn = document.getElementById("new-chat-btn");
const loadingIndicator = document.getElementById("loading-indicator");

// Mobile menu elements
const mobileMenuBtn = document.getElementById('mobile-menu');
const closeSidebarBtn = document.getElementById('close-sidebar');
const sidebarElement = document.getElementById('chat-list');
const overlay = document.createElement('div');
overlay.className = 'overlay';
document.body.appendChild(overlay);

// Loading indicator functions
function showLoadingIndicator() {
    loadingIndicator.classList.remove("hidden");
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideLoadingIndicator() {
    loadingIndicator.classList.add("hidden");
}

// Update localStorage helper function
function updateLocalStorage() {
    try {
        localStorage.setItem('currentThreadId', thread_id);
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
}

// Separate display message function (doesn't modify storage)
function displayMessage(content, isUser) {
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
}

// Modified addMessage function (handles both display and storage)
function addMessage(content, isUser) {
    displayMessage(content, isUser);

    if (!chatMessages[thread_id]) {
        chatMessages[thread_id] = [];
    }
    chatMessages[thread_id].push({ content, isUser });
    updateLocalStorage();
}

// Modified loadChat function (only displays messages)
function loadChat(threadId) {
    messagesContainer.innerHTML = '';
    const messages = chatMessages[threadId] || [];
    messages.forEach(msg => {
        displayMessage(msg.content, msg.isUser);
    });
}

function updateChatList() {
    chatItems.innerHTML = '';
    chatHistory.forEach(threadId => {
        const chatItem = document.createElement("li");
        chatItem.innerHTML = `
            <i class="fas fa-message"></i>
            <span>Chat ${threadId.substring(0, 5)}</span>
        `;
        
        if (threadId === thread_id) {
            chatItem.classList.add('active');
        }
        
        chatItem.addEventListener("click", () => {
            document.querySelectorAll('#chat-items li').forEach(item => {
                item.classList.remove('active');
            });
            chatItem.classList.add('active');
            thread_id = threadId;
            loadChat(threadId);
            updateLocalStorage();
            
            if (window.innerWidth <= 768) {
                sidebarElement.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
        
        chatItems.appendChild(chatItem);
    });
}

// Message sending functionality
async function sendMessage(message) {
    addMessage(message, true);
    userInput.value = "";
    showLoadingIndicator();

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

        hideLoadingIndicator();

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        addMessage(data.message || "No response from assistant.", false);
    } catch (error) {
        hideLoadingIndicator();
        console.error("Error:", error);
        addMessage("Error: Unable to reach assistant.", false);
    }
}

// Mobile menu functionality
function toggleSidebar() {
    sidebarElement.classList.toggle('active');
    overlay.classList.toggle('active');
}

// Event listeners
mobileMenuBtn.addEventListener('click', toggleSidebar);
closeSidebarBtn.addEventListener('click', toggleSidebar);
overlay.addEventListener('click', toggleSidebar);

sendBtn.addEventListener("click", () => {
    const message = userInput.value.trim();
    if (message) {
        sendMessage(message);
    }
});

userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const message = userInput.value.trim();
        if (message) {
            sendMessage(message);
        }
    }
});

newChatBtn.addEventListener("click", () => {
    thread_id = Math.random().toString(36).substring(7);
    chatMessages[thread_id] = [];
    chatHistory.unshift(thread_id);
    updateLocalStorage();
    
    messagesContainer.innerHTML = '';
    userInput.value = '';
    updateChatList();
    
    // Display welcome message for new chat
    displayWelcomeMessage();
    
    if (window.innerWidth <= 768) {
        sidebarElement.classList.remove('active');
        overlay.classList.remove('active');
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        sidebarElement.classList.remove('active');
        overlay.classList.remove('active');
    }
});

// Initialize the application
window.addEventListener('DOMContentLoaded', () => {
    updateChatList();
    loadChat(thread_id);
});

// Add this function to handle clearing conversations
function clearConversations() {
    // Clear localStorage
    localStorage.removeItem('currentThreadId');
    localStorage.removeItem('chatHistory');
    localStorage.removeItem('chatMessages');
    
    // Create new thread
    thread_id = Math.random().toString(36).substring(7);
    chatHistory = [thread_id];
    chatMessages = { [thread_id]: [] };
    
    // Save new state
    updateLocalStorage();
    
    // Clear UI
    messagesContainer.innerHTML = '';
    userInput.value = '';
    
    // Display welcome message after clearing
    displayWelcomeMessage();
    
    // Update chat list
    updateChatList();
    
    // If on mobile, close the sidebar
    if (window.innerWidth <= 768) {
        sidebarElement.classList.remove('active');
        overlay.classList.remove('active');
    }
}

// Add this to your event listeners section
const clearChatsBtn = document.getElementById('clear-chats-btn');
clearChatsBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all conversations? This cannot be undone.')) {
        clearConversations();
    }
});

// Add this function to display the welcome message
function displayWelcomeMessage() {
    const welcomeMessage = `
<h3 style="margin: 0 0 15px 0; color: #00ED64;">👋 Hello!</h3>

<p style="margin: 0 0 15px 0;">I am a chat bot powered by <strong>MongoDB</strong>, <strong>AWS</strong> and <strong>BuildShip</strong> that helps you find out more about the AWS re:Invent 2024 agenda.</p>

<p style="margin: 0;">How can I help you?</p>`;
    
    const messageDiv = document.createElement("div");
    messageDiv.className = "message assistant-message";
    
    const messageContent = document.createElement("div");
    messageContent.className = "message-content";
    messageContent.innerHTML = welcomeMessage;
    
    messageDiv.appendChild(messageContent);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Add to chat messages
    if (!chatMessages[thread_id]) {
        chatMessages[thread_id] = [];
    }
    chatMessages[thread_id].push({ content: welcomeMessage, isUser: false });
    updateLocalStorage();
}
