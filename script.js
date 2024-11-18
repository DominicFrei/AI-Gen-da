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

// Add the MongoDB example chat content
const mongodbExample = {
    messages: [
        {
            content: `Hello!

I am a chat bot powered by MongoDB, AWS and BuildShip that helps you find out more about the AWS re:Invent 2024 agenda.

How can I help you?`,
            isUser: false
        },
        {
            content: "Show me the MongoDB sessions for this conference, please.",
            isUser: true
        },
        {
            content: `There are two MongoDB-related sessions at AWS re:Invent 2024:


1. "Building your AI stack with MongoDB, Anyscale, Cohere & Fireworks AI" (AIM104-S)
    - Date: December 4, 2024
    - Time: 13:00 - 14:00
    - Location: Wynn | Upper Convention Promenade | Bollinger
    - Type: Breakout session (sponsored by MongoDB)
    - Abstract: This session features a panel discussion with founders and engineering leaders from MongoDB, Anyscale, Cohere, and Fireworks AI. They will discuss how AI has changed their businesses, factors to consider when building LLM applications, and lessons learned from building AI tools and technologies. You'll learn about exciting AI use cases, challenges in moving LLM applications from prototype to production, and perspectives on the future of AI.


2. "Deep dive into Amazon DocumentDB and its innovations" (DAT324)
    - Date: December 3, 2024
    - Time: 16:30 - 17:30
    - Location: Wynn | Level 1 | Lafite 4 | Content Hub | Orange Screen
    - Type: Breakout session
    - Abstract: While not specifically about MongoDB, this session focuses on Amazon DocumentDB, which has MongoDB compatibility. It covers new features of Amazon DocumentDB, including global cluster failover, global cluster switchover, compression, and the latest query APIs. You'll learn how these features can improve the resilience, performance, and effectiveness of your applications.

These sessions offer insights into MongoDB's role in AI applications and AWS's MongoDB-compatible database solution, providing valuable information about the latest developments in MongoDB and related technologies.`,
            isUser: false
        },
        {
            content: "I am a developer advocate. Which one is most beneficial for me?",
            isUser: true
        },
        {
            content: `For a developer advocate, I would recommend:

"Building your AI stack with MongoDB, Anyscale, Cohere & Fireworks AI" (AIM104-S)

This session is more beneficial for a developer advocate for several reasons:


1. Industry Insights: As a developer advocate, you need to stay informed about the latest trends and how different companies are leveraging technologies. This panel discussion with leaders from MongoDB, Anyscale, Cohere, and Fireworks AI will provide you with diverse perspectives on how AI is impacting businesses across the industry.


2. AI and MongoDB Integration: The session focuses on building AI stacks with MongoDB, which is crucial knowledge for advocating MongoDB's capabilities in AI applications. This aligns well with your need to understand and communicate how MongoDB fits into cutting-edge technology stacks.


3. LLM Applications: You'll gain insights into building Large Language Model (LLM) applications, which is a hot topic in the developer community. This knowledge will be valuable when engaging with developers who are exploring AI integration in their projects.


4. Use Cases and Challenges: The session promises to cover exciting AI use cases and the challenges of moving LLM applications from prototype to production. This practical information will be invaluable when you're advising developers on real-world implementations.


5. Future Trends: As a developer advocate, you need to be ahead of the curve. This session will provide perspectives on what's coming next in AI, helping you prepare developers for future developments.


6. Q&A Opportunity: The session encourages attendees to bring questions, which is perfect for a developer advocate. You can ask specific questions that will help you better support your developer community.


7. Networking: This session provides an excellent opportunity to connect with leaders in the AI and database fields, which can be beneficial for your role in building relationships and gathering insights.

While the Amazon DocumentDB session (DAT324) is also informative, it's more focused on specific technical features of a MongoDB-compatible service. As a developer advocate, the broader industry perspective and AI focus of the AIM104-S session will likely provide you with more versatile knowledge to support and inspire your developer community.`,
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
        if (exampleType === 'mongodb') {
            mongodbExample.messages.forEach(msg => {
                displayMessage(msg.content, msg.isUser);
            });
        }
        // We'll add AWS and BuildShip examples later
        
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
