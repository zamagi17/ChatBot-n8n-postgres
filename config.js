// Configuration for n8n webhook
const CONFIG = {
    // Untuk development - pilih SALAH SATU:
    
    // OPTION 1: Direct ke n8n (butuh CORS enabled)
    N8N_WEBHOOK_URL: 'http://localhost:5678/webhook/chat-message',
    
    BACKEND_URL: 'http://localhost:3001/api/chat', // Sesuaikan port
    SESSION_ID: 'toko-kopi-' + Date.now(),
    
    // API endpoints (adjust based on your n8n workflow)
    ENDPOINTS: {
        CHAT: '/webhook-test/chat-message',
        LIST_TABLES: '/webhook/list-tables',
        GET_SCHEMA: '/webhook/get-schema',
        EXECUTE_QUERY: '/webhook/execute-query'
    }
};

// Security configuration
const SECURITY = {
    VALIDATE_SESSION: true,
    RATE_LIMITING: {
        MAX_REQUESTS: 100,
        TIME_WINDOW: 900000 // 15 minutes
    }
};