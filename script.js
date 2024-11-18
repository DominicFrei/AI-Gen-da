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

    // Check if the content already contains HTML formatting
    const isPreformattedHtml = content.trim().startsWith('<');
    
    if (!isUser) {
        if (isPreformattedHtml) {
            // If it's already HTML formatted, use it directly
            messageContent.innerHTML = content;
        } else {
            // If it's plain text, apply our formatting
            const formattedContent = content
                .replace(/\n\s*\n\s*\n/g, '\n\n')  // Replace triple newlines with double
                .replace(/\n/g, "<br>")
                .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;")
                .replace(/(\d+)\./g, "<br><strong>$1.</strong>")
                .replace(/   - /g, "&nbsp;&nbsp;&nbsp;&nbsp;- ")
                .replace(/(\b[a-c]\.\b)/g, "<br>&nbsp;&nbsp;&nbsp;<strong>$1</strong>");
            messageContent.innerHTML = formattedContent;
        }
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

// Update the WELCOME_MESSAGE to be pre-formatted HTML
const WELCOME_MESSAGE = `
<h3 style="margin: 0 0 15px 0; color: #00ED64;">👋 Hello!</h3>
<p style="margin: 0 0 15px 0;">I am a chat bot powered by <strong>MongoDB</strong>, <strong>AWS</strong> and <strong>BuildShip</strong> that helps you find out more about the AWS re:Invent 2024 agenda.</p>
<p style="margin: 0;">How can I help you?</p>`;

// Update displayWelcomeMessage to use the pre-formatted message directly
function displayWelcomeMessage() {
    const messageDiv = document.createElement("div");
    messageDiv.className = "message assistant-message";
    
    const messageContent = document.createElement("div");
    messageContent.className = "message-content";
    messageContent.innerHTML = WELCOME_MESSAGE;
    
    messageDiv.appendChild(messageContent);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Add to chat messages
    if (!chatMessages[thread_id]) {
        chatMessages[thread_id] = [];
    }
    chatMessages[thread_id].push({ content: WELCOME_MESSAGE, isUser: false });
    updateLocalStorage();
}

// Modify the initialization code
if (!localStorage.getItem('hasInitialized')) {
    // Clear any existing data
    localStorage.clear();
    
    // Initialize empty state
    thread_id = Math.random().toString(36).substring(7);
    chatHistory = [];
    chatMessages = {};
    
    // Create demo chats
    initializeDemoChats().then(() => {
        // Save state after demo chats are created
        updateLocalStorage();
        // Mark as initialized
        localStorage.setItem('hasInitialized', 'true');
    });
} else {
    // Load existing data
    thread_id = localStorage.getItem('currentThreadId');
    chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    chatMessages = JSON.parse(localStorage.getItem('chatMessages') || '{}');
    
    // Update UI
    updateChatList();
    if (thread_id) {
        loadChat(thread_id);
    }
}

// Modify addChatSession to include chat titles
function addChatSession(threadId, title) {
    const chatItem = document.createElement("li");
    chatItem.innerHTML = `
        <i class="fas fa-message"></i>
        <span>${title || `Chat ${threadId.substring(0, 5)}`}</span>
    `;
    
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
    
    if (threadId === thread_id) {
        chatItem.classList.add('active');
    }
    
    chatItems.appendChild(chatItem);
}

// Define the example chats
const mongodbExample = {
    messages: [
        {
            content: WELCOME_MESSAGE,
            isUser: false
        },
        {
            content: "Show me the MongoDB sessions for this conference, please.",
            isUser: true
        },
        {
            content: `<p>There are two MongoDB-related sessions at AWS re:Invent 2024:</p>

<p>1. "Building your AI stack with MongoDB, Anyscale, Cohere & Fireworks AI" (AIM104-S)</p>
<ul style="margin: 5px 0 15px 20px;">
    <li>Date: December 4, 2024</li>
    <li>Time: 13:00 - 14:00</li>
    <li>Location: Wynn | Upper Convention Promenade | Bollinger</li>
    <li>Type: Breakout session (sponsored by MongoDB)</li>
    <li>Abstract: This session features a panel discussion with founders and engineering leaders from MongoDB, Anyscale, Cohere, and Fireworks AI. They will discuss how AI has changed their businesses, factors to consider when building LLM applications, and lessons learned from building AI tools and technologies.</li>
</ul>

<p>2. "Deep dive into Amazon DocumentDB and its innovations" (DAT324)</p>
<ul style="margin: 5px 0 15px 20px;">
    <li>Date: December 3, 2024</li>
    <li>Time: 16:30 - 17:30</li>
    <li>Location: Wynn | Level 1 | Lafite 4 | Content Hub | Orange Screen</li>
    <li>Type: Breakout session</li>
    <li>Abstract: While not specifically about MongoDB, this session focuses on Amazon DocumentDB, which has MongoDB compatibility. It covers new features of Amazon DocumentDB, including global cluster failover, global cluster switchover, compression, and the latest query APIs.</li>
</ul>`,
            isUser: false
        }
    ]
};

const awsExample = {
    messages: [
        {
            content: WELCOME_MESSAGE,
            isUser: false
        },
        {
            content: "What are the main keynotes at re:Invent 2024?",
            isUser: true
        },
        {
            content: `<p>Here are the main keynotes at AWS re:Invent 2024:</p>

<p>1. Monday Night Live with Peter DeSantis</p>
<ul style="margin: 5px 0 15px 20px;">
    <li>Date: December 2, 2024</li>
    <li>Time: 20:00 - 21:30</li>
    <li>Location: The Venetian | Level 2 | Venetian Theater</li>
    <li>Speaker: Peter DeSantis, Senior Vice President of AWS Utility Computing</li>
</ul>

<p>2. Adam Selipsky Keynote</p>
<ul style="margin: 5px 0 15px 20px;">
    <li>Date: December 3, 2024</li>
    <li>Time: 8:30 - 10:30</li>
    <li>Location: The Venetian | Level 2 | Venetian Theater</li>
    <li>Speaker: Adam Selipsky, CEO of Amazon Web Services</li>
</ul>

<p>3. Dr. Swami Sivasubramanian Keynote</p>
<ul style="margin: 5px 0 15px 20px;">
    <li>Date: December 4, 2024</li>
    <li>Time: 8:30 - 10:30</li>
    <li>Location: The Venetian | Level 2 | Venetian Theater</li>
    <li>Speaker: Dr. Swami Sivasubramanian, Vice President of Data and AI</li>
</ul>`,
            isUser: false
        }
    ]
};

const buildshipExample = {
    messages: [
        {
            content: WELCOME_MESSAGE,
            isUser: false
        },
        {
            content: "Tell me about BuildShip sessions at re:Invent.",
            isUser: true
        },
        {
            content: `<p>BuildShip is showcasing its AI deployment and hosting capabilities at AWS re:Invent 2024:</p>

<p>1. "Deploying AI Applications with BuildShip" (Demo)</p>
<ul style="margin: 5px 0 15px 20px;">
    <li>Date: December 3-5, 2024</li>
    <li>Location: AWS Village | AI/ML Section | Booth B42</li>
    <li>Type: Live demonstrations</li>
    <li>Description: See how BuildShip simplifies AI application deployment on AWS infrastructure. Learn about instant deployments, automatic scaling, and cost optimization for AI workloads.</li>
</ul>

<p>2. "BuildShip Office Hours"</p>
<ul style="margin: 5px 0 15px 20px;">
    <li>Date: December 4, 2024</li>
    <li>Time: 14:00 - 16:00</li>
    <li>Location: AWS Village | Developer Lounge</li>
    <li>Type: One-on-one sessions</li>
    <li>Description: Meet with BuildShip engineers to discuss your AI deployment challenges and learn best practices for hosting AI applications on AWS.</li>
</ul>`,
            isUser: false
        }
    ]
};

// Add click handlers for example chats
document.querySelectorAll('.example-item').forEach(item => {
    item.addEventListener('click', () => {
        const exampleType = item.dataset.example;
        
        // Clear current chat
        messagesContainer.innerHTML = '';
        
        // Load example chat based on type
        let exampleChat;
        switch(exampleType) {
            case 'mongodb':
                exampleChat = mongodbExample;
                break;
            case 'aws':
                exampleChat = awsExample;
                break;
            case 'buildship':
                exampleChat = buildshipExample;
                break;
            default:
                return;
        }
        
        // Display example messages
        exampleChat.messages.forEach(msg => {
            displayMessage(msg.content, msg.isUser);
        });
        
        // Update UI
        document.querySelectorAll('#chat-items li, .example-item').forEach(chat => {
            chat.classList.remove('active');
        });
        item.classList.add('active');
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            sidebarElement.classList.remove('active');
            overlay.classList.remove('active');
        }
    });
});

