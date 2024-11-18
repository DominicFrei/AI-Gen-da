// First, load data from localStorage
let thread_id = localStorage.getItem('currentThreadId');
let chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
let chatMessages = JSON.parse(localStorage.getItem('chatMessages') || '{}');
let chatTitles = JSON.parse(localStorage.getItem('chatTitles') || '{}');

// If there's no thread_id or chat history, initialize with a new chat
if (!thread_id || chatHistory.length === 0) {
    thread_id = Math.random().toString(36).substring(7);
    chatHistory = [thread_id];
    chatMessages = { [thread_id]: [] };
    chatTitles = { [thread_id]: 'New Chat' };
    // Save initial state
    localStorage.setItem('currentThreadId', thread_id);
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
        localStorage.setItem('currentThreadId', thread_id);
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
        const title = chatTitles[threadId] || 'New Chat';
        chatItem.innerHTML = `
            <i class="fas fa-message"></i>
            <span>${title}</span>
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
    const isFirstMessage = !chatMessages[thread_id] || chatMessages[thread_id].length <= 1; // Check if only welcome message exists
    
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

        // Generate title after first message exchange (including welcome message)
        if (isFirstMessage) {
            const title = await generateChatTitle(chatMessages[thread_id]);
            if (title) {
                chatTitles[thread_id] = title;
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
    thread_id = Math.random().toString(36).substring(7);
    chatMessages[thread_id] = [];
    chatHistory.unshift(thread_id);
    chatTitles[thread_id] = 'New Chat';
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
    loadChat(thread_id);
});

// Add this function to handle clearing conversations
function clearConversations() {
    // Clear localStorage
    localStorage.removeItem('currentThreadId');
    localStorage.removeItem('chatHistory');
    localStorage.removeItem('chatMessages');
    localStorage.removeItem('chatTitles');
    
    // Create new thread
    thread_id = Math.random().toString(36).substring(7);
    chatHistory = [thread_id];
    chatMessages = { [thread_id]: [] };
    chatTitles = { [thread_id]: 'New Chat' };
    
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
    
    // Initialize empty state with just a new chat
    thread_id = Math.random().toString(36).substring(7);
    chatHistory = [thread_id];
    chatMessages = { [thread_id]: [] };
    chatTitles = { [thread_id]: 'New Chat' };
    
    // Save initial state
    updateLocalStorage();
    // Mark as initialized
    localStorage.setItem('hasInitialized', 'true');
    
    // Display welcome message
    displayWelcomeMessage();
} else {
    // Load existing data
    thread_id = localStorage.getItem('currentThreadId');
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
        if (thread_id) {
            loadChat(thread_id);
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
        },
        {
            content: "I am a developer advocate. Which one is most helpful for me?",
            isUser: true
        },
        {
            content: `<p>As a developer advocate, I would recommend attending the session:</p>

<div style="background: rgba(0,237,100,0.1); padding: 15px; border-radius: 8px; margin: 15px 0;">
    <p style="margin: 0;"><strong>"Building your AI stack with MongoDB, Anyscale, Cohere & Fireworks AI"</strong> (sponsored by MongoDB)</p>
    <ul style="margin: 10px 0 0 20px; padding: 0;">
        <li>Session Code: AIM104-S</li>
        <li>Date: December 4, 2024</li>
        <li>Time: 13:00 - 14:00</li>
        <li>Location: Wynn | Upper Convention Promenade | Bollinger</li>
    </ul>
</div>

<p>This session is likely to be more helpful for you as a developer advocate for several reasons:</p>

<ol style="margin: 15px 0;">
    <li><strong>Broader perspective:</strong> The panel includes leaders from multiple companies (MongoDB, Anyscale, Cohere, and Fireworks AI), giving you a wider view of the AI ecosystem and how different technologies integrate.</li>

    <li><strong>AI focus:</strong> As AI is a hot topic in tech, understanding its intersection with databases like MongoDB will be valuable for engaging with developers and showcasing cutting-edge applications.</li>

    <li><strong>Industry insights:</strong> You'll gain insight into how AI is changing businesses, which is crucial for advocating to developers about future trends and opportunities.</li>

    <li><strong>Practical knowledge:</strong> The session covers lessons learned in building AI tools and technologies, which you can share with your developer community.</li>

    <li><strong>Future-oriented:</strong> Discussion on what's coming next in AI will help you prepare developers for upcoming changes and opportunities in the field.</li>

    <li><strong>Q&A opportunity:</strong> As a developer advocate, you can use this session to gather information and ask questions that will benefit the developers you work with.</li>
</ol>

<p>This session aligns well with a developer advocate's role of staying informed about industry trends, understanding practical applications, and gathering insights to share with the developer community.</p>`,
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
            content: `<p>If your main interest is DevOps on AWS, I recommend the following sessions at AWS re:Invent 2024:</p>

<div style="margin: 20px 0;">
    <p>1. "Supercharge your DevOps practices with generative AI" (DEV321)</p>
    <ul style="margin: 5px 0 15px 20px;">
        <li>Date: December 2, 2024</li>
        <li>Time: 10:00 - 11:00</li>
        <li>Location: Venetian | Level 3 | Murano 3304</li>
    </ul>
    <p>This session focuses on how generative AI can revolutionize DevOps practices, improving deployment frequency, reducing lead time for changes, and minimizing service disruptions. It includes live demos of Amazon Q and Amazon Bedrock to streamline workflows and automate tasks.</p>
</div>

<div style="margin: 20px 0;">
    <p>2. "Supercharge your innovation: Automate for operational excellence" (SUP307)</p>
    <ul style="margin: 5px 0 15px 20px;">
        <li>Date: December 5, 2024</li>
        <li>Time: 11:30 - 12:30</li>
        <li>Location: MGM Grand | Level 1 | Grand 119</li>
    </ul>
    <p>This session covers AWS best practices for streamlining operations and optimizing costs. It explores AWS's own automation practices and strategies to drive growth and innovation, with real operational use cases.</p>
</div>

<div style="margin: 20px 0;">
    <p>3. "Building the future of cloud operations at any scale" (COP202-INT)</p>
    <ul style="margin: 5px 0 15px 20px;">
        <li>Date: December 2, 2024</li>
        <li>Time: 09:00 - 10:00</li>
        <li>Location: Venetian | Level 5 | Palazzo Ballroom B</li>
    </ul>
    <p>While not explicitly labeled as DevOps, this session addresses key DevOps concerns such as improving efficiency, enhancing security and compliance, and making operations more intelligent and agile.</p>
</div>

<div style="margin: 20px 0;">
    <p>4. "Reimagining the developer experience at AWS" (DOP220-INT)</p>
    <ul style="margin: 5px 0 15px 20px;">
        <li>Date: December 5, 2024</li>
        <li>Time: 14:00 - 15:00</li>
        <li>Location: Venetian | Level 5 | Palazzo Ballroom B</li>
    </ul>
    <p>This session explores how generative AI is transforming software development, which is crucial for modern DevOps practices. It covers cloud-native innovation and the integration of AI agents across the development lifecycle.</p>
</div>

<p>These sessions cover a range of DevOps topics, from automation and operational excellence to the integration of AI in DevOps practices, providing a comprehensive view of DevOps on AWS.</p>`,
            isUser: false
        },
        {
            content: "If I only have time for one, which one would you choose and why?",
            isUser: true
        },
        {
            content: `<p>If you only have time for one session, I would recommend:</p>

<div style="background: rgba(0,237,100,0.1); padding: 15px; border-radius: 8px; margin: 15px 0;">
    <p style="margin: 0;"><strong>"Supercharge your DevOps practices with generative AI"</strong> (DEV321)</p>
    <ul style="margin: 10px 0 0 20px; padding: 0;">
        <li>Date: December 2, 2024</li>
        <li>Time: 10:00 - 11:00</li>
        <li>Location: Venetian | Level 3 | Murano 3304</li>
    </ul>
</div>

<p>Here's why this session stands out:</p>

<ol style="margin: 15px 0;">
    <li><strong>Direct DevOps Focus:</strong> This session is specifically tailored to DevOps practices, which aligns perfectly with your main interest.</li>

    <li><strong>Cutting-edge Technology:</strong> It explores the integration of generative AI into DevOps, which is at the forefront of DevOps evolution. This knowledge will be crucial for staying ahead in the field.</li>

    <li><strong>Practical Demonstrations:</strong> The session includes live demos of Amazon Q and Amazon Bedrock, providing hands-on insights into how these tools can be applied in real DevOps scenarios.</li>

    <li><strong>Comprehensive Coverage:</strong> It addresses key DevOps metrics like deployment frequency, lead time for changes, service disruptions, and change failure rates. This comprehensive approach covers the full spectrum of DevOps concerns.</li>

    <li><strong>Actionable Takeaways:</strong> The session promises to provide practical strategies for harnessing generative AI in DevOps, which you can potentially implement in your own work.</li>

    <li><strong>AWS-Specific Tools:</strong> By focusing on Amazon Q and Amazon Bedrock, you'll gain insights into AWS-specific tools that can enhance your DevOps practices on the AWS platform.</li>

    <li><strong>Future-Oriented:</strong> Understanding how generative AI is transforming DevOps will prepare you for the future of cloud operations and development practices.</li>
</ol>

<p>This session offers a blend of cutting-edge technology, practical applications, and AWS-specific knowledge, making it the most valuable choice if you can only attend one DevOps-focused session at re:Invent 2024.</p>`,
            isUser: false
        },
        {
            content: "Anything about Infrastructure-as-code?",
            isUser: true
        },
        {
            content: `<p>I apologize, but I couldn't find any sessions specifically dedicated to Infrastructure-as-Code (IaC) in the search results provided. However, this doesn't necessarily mean there are no IaC-related sessions at AWS re:Invent 2024. IaC is an important topic in cloud computing and DevOps, so it's likely to be covered in some capacity.</p>

<p>Here are a few suggestions:</p>

<ol style="margin: 15px 0;">
    <li>The session <strong>"Reimagining the developer experience at AWS"</strong> (DOP220-INT) might touch on IaC as part of the broader discussion on software development practices and cloud-native innovation.</li>

    <li><strong>"Compute innovation for any application, anywhere"</strong> (CMP215-INT) could potentially include information about IaC in the context of managing infrastructure for various compute options.</li>

    <li>IaC principles might be discussed in DevOps-focused sessions like <strong>"Supercharge your DevOps practices with generative AI"</strong> (DEV321), which we discussed earlier.</li>
</ol>

<p>To find sessions specifically about Infrastructure-as-Code, I recommend:</p>

<ul style="margin: 15px 0; padding-left: 20px;">
    <li>Check the full AWS re:Invent 2024 agenda when it becomes available, as it may have more detailed session descriptions.</li>

    <li>Look for sessions related to AWS CloudFormation, AWS CDK (Cloud Development Kit), or Terraform, as these are popular IaC tools used with AWS.</li>

    <li>Consider attending broader DevOps or cloud architecture sessions, as IaC is often covered as part of these topics.</li>

    <li>Visit the AWS booth or attend Q&A sessions where you can ask AWS experts about IaC best practices and tools.</li>
</ul>

<p>If IaC is a crucial topic for you, it might be worth reaching out to AWS re:Invent organizers directly to inquire about any sessions or workshops focusing on this area.</p>`,
            isUser: false
        }
    ]
};

// Modify the click handlers for example chats to not interact with localStorage
document.querySelectorAll('.example-item').forEach(item => {
    item.addEventListener('click', () => {
        const exampleType = item.dataset.example;
        
        // Clear current chat display
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
            default:
                return;
        }
        
        // Just display the messages without affecting localStorage
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

