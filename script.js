// First, load data from localStorage
let threadId = localStorage.getItem('currentThreadId');
let chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
let chatMessages = JSON.parse(localStorage.getItem('chatMessages') || '{}');
let chatTitles = JSON.parse(localStorage.getItem('chatTitles') || '{}');

// If there's no threadId or chat history, initialize with a new chat
if (!threadId || chatHistory.length === 0) {
    threadId = Math.random().toString(36).substring(7);
    chatHistory = [threadId];
    chatMessages = { [threadId]: [] };
    chatTitles = { [threadId]: 'New Chat' };
    // Save initial state
    localStorage.setItem('currentThreadId', threadId);
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
    localStorage.setItem('chatTitles', JSON.stringify(chatTitles));
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
        localStorage.setItem('currentThreadId', threadId);
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
        localStorage.setItem('chatTitles', JSON.stringify(chatTitles));
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
        // Configure marked options
        marked.setOptions({
            highlight: function(code, language) {
                if (language && hljs.getLanguage(language)) {
                    return hljs.highlight(code, { language: language }).value;
                }
                return hljs.highlightAuto(code).value;
            },
            breaks: true,
            gfm: true
        });

        // Parse markdown
        messageContent.innerHTML = marked.parse(content);

        // Apply syntax highlighting to any code blocks
        messageContent.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
        });
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

    if (!chatMessages[threadId]) {
        chatMessages[threadId] = [];
    }
    chatMessages[threadId].push({ content, isUser });
    updateLocalStorage();
}

// Modified loadChat function (only displays messages)
function loadChat(chatThreadId) {
    // Reset example mode when loading a real chat
    isViewingExample = false;
    
    // Re-enable input area
    userInput.disabled = false;
    userInput.placeholder = "Send a message...";
    sendBtn.disabled = false;
    document.querySelector('.input-wrapper').classList.remove('disabled');
    
    messagesContainer.innerHTML = '';
    const messages = chatMessages[chatThreadId] || [];
    messages.forEach(msg => {
        displayMessage(msg.content, msg.isUser);
    });
}

function updateChatList() {
    chatItems.innerHTML = '';
    chatHistory.forEach(threadId => {
        const chatItem = document.createElement("li");
        const title = chatTitles[threadId] || 'New Chat';
        chatItem.innerHTML = `
            <i class="fas fa-message"></i>
            <span>${title}</span>
        `;
        
        if (threadId === threadId) {
            chatItem.classList.add('active');
        }
        
        chatItem.addEventListener("click", () => {
            document.querySelectorAll('#chat-items li').forEach(item => {
                item.classList.remove('active');
            });
            chatItem.classList.add('active');
            threadId = threadId;
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
    const isFirstMessage = !chatMessages[threadId] || chatMessages[threadId].length <= 1; // Check if only welcome message exists
    
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
                threadId: threadId
            })
        });

        hideLoadingIndicator();

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        addMessage(data.message || "No response from assistant.", false);

        // Generate title after first message exchange (including welcome message)
        if (isFirstMessage) {
            const title = await generateChatTitle(chatMessages[threadId]);
            if (title) {
                chatTitles[threadId] = title;
                updateLocalStorage();
                updateChatList();
            }
        }
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
    // Reset example mode
    isViewingExample = false;
    
    // Re-enable input area
    userInput.disabled = false;
    userInput.placeholder = "Send a message...";
    sendBtn.disabled = false;
    document.querySelector('.input-wrapper').classList.remove('disabled');
    
    threadId = Math.random().toString(36).substring(7);
    chatMessages[threadId] = [];
    chatHistory.unshift(threadId);
    chatTitles[threadId] = 'New Chat';
    updateLocalStorage();
    
    messagesContainer.innerHTML = '';
    userInput.value = '';
    updateChatList();
    
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
    loadChat(threadId);
});

// Add this function to handle clearing conversations
function clearConversations() {
    // Clear localStorage
    localStorage.removeItem('currentThreadId');
    localStorage.removeItem('chatHistory');
    localStorage.removeItem('chatMessages');
    localStorage.removeItem('chatTitles');
    
    // Create new thread
    threadId = Math.random().toString(36).substring(7);
    chatHistory = [threadId];
    chatMessages = { [threadId]: [] };
    chatTitles = { [threadId]: 'New Chat' };
    
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
    if (!chatMessages[threadId]) {
        chatMessages[threadId] = [];
    }
    chatMessages[threadId].push({ content: WELCOME_MESSAGE, isUser: false });
    updateLocalStorage();
}

// Modify the initialization code
if (!localStorage.getItem('hasInitialized')) {
    // Clear any existing data
    localStorage.clear();
    
    // Initialize empty state with just a new chat
    threadId = Math.random().toString(36).substring(7);
    chatHistory = [threadId];
    chatMessages = { [threadId]: [] };
    chatTitles = { [threadId]: 'New Chat' };
    
    // Save initial state
    updateLocalStorage();
    // Mark as initialized
    localStorage.setItem('hasInitialized', 'true');
    
    // Display welcome message
    displayWelcomeMessage();
} else {
    // Load existing data
    threadId = localStorage.getItem('currentThreadId');
    chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    chatMessages = JSON.parse(localStorage.getItem('chatMessages') || '{}');
    chatTitles = JSON.parse(localStorage.getItem('chatTitles') || '{}');
    
    // Generate titles for any chats that don't have them
    Promise.all(chatHistory.map(async (threadId) => {
        if (!chatTitles[threadId] || chatTitles[threadId] === 'New Chat') {
            const messages = chatMessages[threadId];
            if (messages && messages.length > 1) {
                const title = await generateChatTitle(messages);
                if (title) {
                    chatTitles[threadId] = title;
                }
            } else {
                chatTitles[threadId] = 'New Chat';
            }
        }
    })).then(() => {
        updateLocalStorage();
        updateChatList();
        if (threadId) {
            loadChat(threadId);
        }
    });
}

// Add function to generate chat title
async function generateChatTitle(messages) {
    try {
        // Extract text content from HTML messages
        const chatContent = messages.map(msg => {
            let content = msg.content;
            if (!msg.isUser && content.includes('<')) {
                // Create a temporary div to parse HTML and get text content
                const temp = document.createElement('div');
                temp.innerHTML = content;
                content = temp.textContent;
            }
            return `${msg.isUser ? 'User' : 'Assistant'}: ${content}`;
        }).join('\n\n');
        
        const response = await fetch(backendUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: `Summarise this chat into 5-6 words to be used as a heading: ${chatContent}`
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.message.replace(/["']/g, '').trim();
    } catch (error) {
        console.error("Error generating chat title:", error);
        return 'New Chat';  // Return 'New Chat' as fallback
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
        threadId = threadId;
        loadChat(threadId);
        updateLocalStorage();
        
        if (window.innerWidth <= 768) {
            sidebarElement.classList.remove('active');
            overlay.classList.remove('active');
        }
    });
    
    if (threadId === threadId) {
        chatItem.classList.add('active');
    }
    
    chatItems.appendChild(chatItem);
}

// Define the static example chats at the top (after WELCOME_MESSAGE)
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
            content: `There are two MongoDB-related sessions at AWS re:Invent 2024:

1. **"Building your AI stack with MongoDB, Anyscale, Cohere & Fireworks AI"** (AIM104-S)
* Date: December 4, 2024
* Time: 13:00 - 14:00
* Location: Wynn | Upper Convention Promenade | Bollinger
* Type: Breakout session (sponsored by MongoDB)
* Abstract: This session features a panel discussion with founders and engineering leaders from MongoDB, Anyscale, Cohere, and Fireworks AI. They will discuss how AI has changed their businesses, factors to consider when building LLM applications, and lessons learned from building AI tools and technologies.

2. **"Deep dive into Amazon DocumentDB and its innovations"** (DAT324)
* Date: December 3, 2024
* Time: 16:30 - 17:30
* Location: Wynn | Level 1 | Lafite 4 | Content Hub | Orange Screen
* Type: Breakout session
* Abstract: While not specifically about MongoDB, this session focuses on Amazon DocumentDB, which has MongoDB compatibility. It covers new features of Amazon DocumentDB, including global cluster failover, global cluster switchover, compression, and the latest query APIs.`,
            isUser: false
        },
        {
            content: "I am a developer advocate. Which one is most helpful for me?",
            isUser: true
        },
        {
            content: `As a developer advocate, I would recommend attending the session:

> **"Building your AI stack with MongoDB, Anyscale, Cohere & Fireworks AI"** (AIM104-S)
> * Date: December 4, 2024
> * Time: 13:00 - 14:00
> * Location: Wynn | Upper Convention Promenade | Bollinger

This session is likely to be more helpful for you as a developer advocate for several reasons:

1. **Broader perspective:** The panel includes leaders from multiple companies (MongoDB, Anyscale, Cohere, and Fireworks AI), giving you a wider view of the AI ecosystem and how different technologies integrate.

2. **AI focus:** As AI is a hot topic in tech, understanding its intersection with databases like MongoDB will be valuable for engaging with developers and showcasing cutting-edge applications.

3. **Industry insights:** You'll gain insight into how AI is changing businesses, which is crucial for advocating to developers about future trends and opportunities.

4. **Practical knowledge:** The session covers lessons learned in building AI tools and technologies, which you can share with your developer community.

5. **Future-oriented:** Discussion on what's coming next in AI will help you prepare developers for upcoming changes and opportunities in the field.

6. **Q&A opportunity:** As a developer advocate, you can use this session to gather information and ask questions that will benefit the developers you work with.

This session aligns well with a developer advocate's role of staying informed about industry trends, understanding practical applications, and gathering insights to share with the developer community.`,
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
            content: "Which sessions should I visit if my main interest is DevOps on AWS?",
            isUser: true
        },
        {
            content: `If your main interest is DevOps on AWS, I recommend the following sessions at AWS re:Invent 2024:

1. **"Supercharge your DevOps practices with generative AI"** (DEV321)
* Date: December 2, 2024
* Time: 10:00 - 11:00
* Location: Venetian | Level 3 | Murano 3304

This session focuses on how generative AI can revolutionize DevOps practices, improving deployment frequency, reducing lead time for changes, and minimizing service disruptions. It includes live demos of Amazon Q and Amazon Bedrock to streamline workflows and automate tasks.

2. **"Supercharge your innovation: Automate for operational excellence"** (SUP307)
* Date: December 5, 2024
* Time: 11:30 - 12:30
* Location: MGM Grand | Level 1 | Grand 119

This session covers AWS best practices for streamlining operations and optimizing costs. It explores AWS's own automation practices and strategies to drive growth and innovation, with real operational use cases.

3. **"Building the future of cloud operations at any scale"** (COP202-INT)
* Date: December 2, 2024
* Time: 09:00 - 10:00
* Location: Venetian | Level 5 | Palazzo Ballroom B

While not explicitly labeled as DevOps, this session addresses key DevOps concerns such as improving efficiency, enhancing security and compliance, and making operations more intelligent and agile.

4. **"Reimagining the developer experience at AWS"** (DOP220-INT)
* Date: December 5, 2024
* Time: 14:00 - 15:00
* Location: Venetian | Level 5 | Palazzo Ballroom B

This session explores how generative AI is transforming software development, which is crucial for modern DevOps practices. It covers cloud-native innovation and the integration of AI agents across the development lifecycle.

These sessions cover a range of DevOps topics, from automation and operational excellence to the integration of AI in DevOps practices, providing a comprehensive view of DevOps on AWS.`,
            isUser: false
        },
        {
            content: "If I only have time for one, which one would you choose and why?",
            isUser: true
        },
        {
            content: `If you only have time for one session, I would recommend:

> **"Supercharge your DevOps practices with generative AI"** (DEV321)
> * Date: December 2, 2024
> * Time: 10:00 - 11:00
> * Location: Venetian | Level 3 | Murano 3304

Here's why this session stands out:

1. **Direct DevOps Focus:** This session is specifically tailored to DevOps practices, which aligns perfectly with your main interest.

2. **Cutting-edge Technology:** It explores the integration of generative AI into DevOps, which is at the forefront of DevOps evolution. This knowledge will be crucial for staying ahead in the field.

3. **Practical Demonstrations:** The session includes live demos of Amazon Q and Amazon Bedrock, providing hands-on insights into how these tools can be applied in real DevOps scenarios.

4. **Comprehensive Coverage:** It addresses key DevOps metrics like deployment frequency, lead time for changes, service disruptions, and change failure rates. This comprehensive approach covers the full spectrum of DevOps concerns.

5. **Actionable Takeaways:** The session promises to provide practical strategies for harnessing generative AI in DevOps, which you can potentially implement in your own work.

6. **AWS-Specific Tools:** By focusing on Amazon Q and Amazon Bedrock, you'll gain insights into AWS-specific tools that can enhance your DevOps practices on the AWS platform.

7. **Future-Oriented:** Understanding how generative AI is transforming DevOps will prepare you for the future of cloud operations and development practices.

This session offers a blend of cutting-edge technology, practical applications, and AWS-specific knowledge, making it the most valuable choice if you can only attend one DevOps-focused session at re:Invent 2024.`,
            isUser: false
        },
        {
            content: "Anything about Infrastructure-as-code?",
            isUser: true
        },
        {
            content: `I apologize, but I couldn't find any sessions specifically dedicated to Infrastructure-as-Code (IaC) in the search results provided. However, this doesn't necessarily mean there are no IaC-related sessions at AWS re:Invent 2024. IaC is an important topic in cloud computing and DevOps, so it's likely to be covered in some capacity.

Here are a few suggestions:

1. The session **"Reimagining the developer experience at AWS"** (DOP220-INT) might touch on IaC as part of the broader discussion on software development practices and cloud-native innovation.

2. **"Compute innovation for any application, anywhere"** (CMP215-INT) could potentially include information about IaC in the context of managing infrastructure for various compute options.

3. IaC principles might be discussed in DevOps-focused sessions like **"Supercharge your DevOps practices with generative AI"** (DEV321), which we discussed earlier.

To find sessions specifically about Infrastructure-as-Code, I recommend:

* Check the full AWS re:Invent 2024 agenda when it becomes available, as it may have more detailed session descriptions.
* Look for sessions related to AWS CloudFormation, AWS CDK (Cloud Development Kit), or Terraform, as these are popular IaC tools used with AWS.
* Consider attending broader DevOps or cloud architecture sessions, as IaC is often covered as part of these topics.
* Visit the AWS booth or attend Q&A sessions where you can ask AWS experts about IaC best practices and tools.

If IaC is a crucial topic for you, it might be worth reaching out to AWS re:Invent organizers directly to inquire about any sessions or workshops focusing on this area.`,
            isUser: false
        }
    ]
};

// Add a variable to track if we're viewing an example
let isViewingExample = false;

// Update the example chat click handlers
document.querySelectorAll('.example-item').forEach(item => {
    item.addEventListener('click', () => {
        const exampleType = item.dataset.example;
        
        // Clear current chat display
        messagesContainer.innerHTML = '';
        
        // Set example mode
        isViewingExample = true;
        
        // Disable input area
        userInput.disabled = true;
        userInput.placeholder = "This is an example chat - start a new chat to ask questions";
        sendBtn.disabled = true;
        
        // Add visual indication that input is disabled
        document.querySelector('.input-wrapper').classList.add('disabled');
        
        // Load example chat based on type
        let exampleChat;
        switch(exampleType) {
            case 'mongodb':
                exampleChat = mongodbExample;
                break;
            case 'aws':
                exampleChat = awsExample;
                break;
            default:
                return;
        }
        
        // Display the messages
        exampleChat.messages.forEach(msg => {
            displayMessage(msg.content, msg.isUser);
        });
        
        // Update UI active states
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

