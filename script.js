const backendUrl = "https://bzjj7l.buildship.run/AWSAgent";
let thread_id = Math.random().toString(36).substring(7);
const chatHistory = [];
const chatMessages = {};

const messagesContainer = document.getElementById("messages");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const chatItems = document.getElementById("chat-items");
const newChatBtn = document.getElementById("new-chat-btn");

// Mobile menu elements
const mobileMenuBtn = document.getElementById('mobile-menu');
const closeSidebarBtn = document.getElementById('close-sidebar');
const sidebarElement = document.getElementById('chat-list');
const overlay = document.createElement('div');
overlay.className = 'overlay';
document.body.appendChild(overlay);

// Add loading indicator functionality
const loadingIndicator = document.getElementById("loading-indicator");

function showLoadingIndicator() {
    loadingIndicator.classList.remove("hidden");
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideLoadingIndicator() {
    loadingIndicator.classList.add("hidden");
}

// Chat functionality
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

function addChatSession(threadId) {
    const chatItem = document.createElement("li");
    chatItem.innerHTML = `
        <i class="fas fa-message"></i>
        <span>Chat ${threadId.substring(0, 5)}</span>
    `;
    
    chatItem.addEventListener("click", () => {
        document.querySelectorAll('#chat-items li').forEach(item => {
            item.classList.remove('active');
        });
        chatItem.classList.add('active');
        loadChat(threadId);
        
        // Close sidebar on mobile when chat is selected
        if (window.innerWidth <= 768) {
            sidebarElement.classList.remove('active');
            overlay.classList.remove('active');
        }
    });
    
    if (chatHistory.length === 0) {
        chatItem.classList.add('active');
    }
    
    chatItems.appendChild(chatItem);
    chatHistory.push(threadId);
}

// Mobile menu functionality
function toggleSidebar() {
    sidebarElement.classList.toggle('active');
    overlay.classList.toggle('active');
}

mobileMenuBtn.addEventListener('click', toggleSidebar);
closeSidebarBtn.addEventListener('click', toggleSidebar);
overlay.addEventListener('click', toggleSidebar);

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

// Event listeners for sending messages
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

// Initialize first chat session
addChatSession(thread_id);

// Handle window resize
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        sidebarElement.classList.remove('active');
        overlay.classList.remove('active');
    }
});

// Add these event listeners after your other initialization code
document.addEventListener('DOMContentLoaded', () => {
    // Add click event listener
    newChatBtn.addEventListener('click', () => {
        // Clear the messages container
        messagesContainer.innerHTML = '';
        
        // Clear the input field
        userInput.value = '';
        
        // Generate new thread_id
        thread_id = Math.random().toString(36).substring(7);
        
        // Add this chat to the chat list
        const newChatItem = document.createElement('li');
        newChatItem.innerHTML = `
            <i class="fas fa-message"></i>
            <span>Chat ${thread_id.substring(0, 5)}</span>
        `;
        newChatItem.classList.add('chat-item', 'active');
        
        // Remove active class from other chat items
        document.querySelectorAll('#chat-items li').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add new chat to the list
        chatItems.insertBefore(newChatItem, chatItems.firstChild);
        
        // If on mobile, close the sidebar
        if (window.innerWidth <= 768) {
            sidebarElement.classList.remove('active');
            overlay.classList.remove('active');
        }
    });
});
