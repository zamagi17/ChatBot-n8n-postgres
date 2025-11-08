class N8NChat {
    constructor() {
        this.messages = [];
        this.isConnected = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateConnectionStatus(true);
        this.setInitialTime();
    }

    setupEventListeners() {
        const input = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendButton');

        input.addEventListener('input', () => {
            sendBtn.disabled = input.value.trim() === '';
        });

        // Enter key to send
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    setInitialTime() {
        const timeElement = document.getElementById('initialTime');
        timeElement.textContent = this.getCurrentTime();
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    updateConnectionStatus(connected) {
        this.isConnected = connected;
        const statusElement = document.getElementById('connectionStatus');
        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('span:last-child');

        if (connected) {
            dot.classList.add('connected');
            text.textContent = 'Connected to n8n';
        } else {
            dot.classList.remove('connected');
            text.textContent = 'Disconnected';
        }
    }

    async sendMessage(messageText = null) {
        const input = document.getElementById('messageInput');
        const text = messageText || input.value.trim();

        if (!text) return;

        // Clear input
        if (!messageText) {
            input.value = '';
            document.getElementById('sendButton').disabled = true;
        }

        // Add user message to UI
        this.addMessage(text, 'user');

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Send to n8n webhook
            const response = await this.sendToN8N(text);
            
            // Remove typing indicator
            this.removeTypingIndicator();
            
            // Add bot response to UI
            this.addMessage(response, 'bot');
        } catch (error) {
            this.removeTypingIndicator();
            this.addMessage('Maaf, terjadi error saat menghubungi server.', 'bot');
            console.error('Error:', error);
            this.updateConnectionStatus(false);
        }
    }

    async sendToN8N(message) {
    const payload = {
        message: message,
        sessionId: CONFIG.SESSION_ID,
        timestamp: new Date().toISOString()
    };

    // GUNAKAN BACKEND_URL JIKA ADA, JIKA TIDAK GUNAKAN N8N_WEBHOOK_URL
    const targetUrl = CONFIG.BACKEND_URL || CONFIG.N8N_WEBHOOK_URL;

    const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data || 'Mohon ulangi pertanyaan anda';
}

    addMessage(text, sender) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}-message`;

        const content = this.formatMessage(text, sender);
        
        messageElement.innerHTML = `
            <div class="message-content">${content}</div>
            <div class="message-time">${this.getCurrentTime()}</div>
        `;

        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Store message
        this.messages.push({ text, sender, time: new Date() });
    }

    formatMessage(text, sender) {
        // Convert to string first to handle any data type
        const textStr = text.toString();
        
        if (sender === 'bot') {
            // Apply bold formatting first
            let formattedText = textStr.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            
            // Format JSON responses as tables
            if (textStr.includes('{') || textStr.includes('[')) {
                try {
                    const data = typeof text === 'string' ? JSON.parse(text) : text;
                    return this.jsonToHTML(data);
                } catch (e) {
                    // Not JSON, return as formatted text with bold
                    return formattedText;
                }
            }
            
            // Format table data
            if (textStr.includes('|') && textStr.includes('-')) {
                return this.markdownTableToHTML(textStr);
            }
            
            return formattedText;
        }
        
        // For user messages, just escape HTML (no formatting)
        return this.escapeHTML(textStr);
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    jsonToHTML(data) {
        if (Array.isArray(data)) {
            return this.arrayToTable(data);
        } else if (typeof data === 'object') {
            return this.objectToTable(data);
        }
        return this.escapeHTML(JSON.stringify(data, null, 2));
    }

    arrayToTable(array) {
        if (array.length === 0) return '<p>Tidak ada data</p>';
        
        const headers = Object.keys(array[0]);
        let html = '<table class="data-table"><thead><tr>';
        
        headers.forEach(header => {
            html += `<th>${this.escapeHTML(header)}</th>`;
        });
        
        html += '</tr></thead><tbody>';
        
        array.forEach(row => {
            html += '<tr>';
            headers.forEach(header => {
                html += `<td>${this.escapeHTML(String(row[header]))}</td>`;
            });
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        return html;
    }

    objectToTable(obj) {
        let html = '<table class="data-table"><tbody>';
        
        Object.entries(obj).forEach(([key, value]) => {
            html += `<tr>
                <td><strong>${this.escapeHTML(key)}</strong></td>
                <td>${this.escapeHTML(String(value))}</td>
            </tr>`;
        });
        
        html += '</tbody></table>';
        return html;
    }

    markdownTableToHTML(text) {
        const lines = text.split('\n').filter(line => line.trim());
        let html = '<table class="data-table">';
        
        lines.forEach((line, index) => {
            if (index === 0) {
                // Header
                html += '<thead><tr>';
                line.split('|').filter(cell => cell.trim()).forEach(cell => {
                    html += `<th>${this.escapeHTML(cell.trim())}</th>`;
                });
                html += '</tr></thead><tbody>';
            } else if (!line.includes('---')) {
                // Data rows
                html += '<tr>';
                line.split('|').filter(cell => cell.trim()).forEach(cell => {
                    html += `<td>${this.escapeHTML(cell.trim())}</td>`;
                });
                html += '</tr>';
            }
        });
        
        html += '</tbody></table>';
        return html;
    }

    showTypingIndicator() {
        const messagesContainer = document.getElementById('chatMessages');
        const typingElement = document.createElement('div');
        typingElement.className = 'message bot-message';
        typingElement.id = 'typingIndicator';
        
        typingElement.innerHTML = `
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(typingElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    removeTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        chat.sendMessage();
    }
}

function sendMessage() {
    chat.sendMessage();
}

// Initialize chat when page loads
let chat;
document.addEventListener('DOMContentLoaded', () => {
    chat = new N8NChat();
});