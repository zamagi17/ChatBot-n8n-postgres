const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

// Enhanced logging middleware
app.use((req, res, next) => {
    console.log('=== NEW REQUEST ===');
    console.log('Time:', new Date().toISOString());
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    next();
});

app.post('/api/chat', async (req, res) => {
    try {
        console.log('📨 INCOMING REQUEST DETAILS:');
        console.log('Session ID:', req.body.sessionId);
        console.log('Message:', req.body.message);
        
        const n8nUrl = 'http://localhost:5678/webhook/chat-message';
        console.log('🔄 Attempting to connect to n8n:', n8nUrl);
        
        // Test if n8n is reachable first
        try {
            const testResponse = await axios.get('http://localhost:5678', { timeout: 5000 });
            console.log('✅ n8n server is reachable');
        } catch (testError) {
            console.log('❌ n8n server is NOT reachable:', testError.message);
            return res.status(503).json({ 
                error: 'n8n server not available',
                message: 'Make sure n8n is running on http://localhost:5678'
            });
        }

        // Now try the actual webhook
        console.log('🚀 Sending request to n8n webhook...');
        const response = await axios.post(n8nUrl, req.body, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 60000 
        });

        console.log('✅ n8n RESPONSE RECEIVED:');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));
        
        res.json(response.data);
        
    } catch (error) {
        console.error('❌ PROXY ERROR DETAILS:');
        
        if (error.code) {
            console.error('Error Code:', error.code);
        }
        
        if (error.response) {
            // n8n responded with error status
            console.error('n8n Response Status:', error.response.status);
            console.error('n8n Response Data:', error.response.data);
            console.error('n8n Response Headers:', error.response.headers);
            
            res.status(error.response.status).json({
                error: 'n8n server error',
                status: error.response.status,
                data: error.response.data
            });
            
        } else if (error.request) {
            // No response received from n8n
            console.error('No response received from n8n');
            console.error('Request details:', error.request);
            
            res.status(502).json({
                error: 'n8n server timeout',
                message: 'n8n did not respond. Check if workflow is active.',
                details: error.message
            });
            
        } else {
            // Other errors
            console.error('Configuration error:', error.message);
            console.error('Stack:', error.stack);
            
            res.status(500).json({
                error: 'Proxy configuration error',
                message: error.message
            });
        }
    }
});

// Simple test endpoint
app.post('/api/test', (req, res) => {
    console.log('Test endpoint called with:', req.body);
    res.json({ 
        status: 'Backend is working!',
        received: req.body,
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'n8n-chat-proxy',
        port: 3001,
        timestamp: new Date().toISOString()
    });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Backend proxy server running on http://localhost:${PORT}`);
    console.log(`✅ Health check: http://localhost:${PORT}/health`);
    console.log(`✅ Test POST: http://localhost:${PORT}/api/test`);
    console.log(`📞 Chat endpoint: http://localhost:${PORT}/api/chat`);
    console.log('=== SERVER STARTED ===');
});