import cds from '@sap/cds';

// Custom server bootstrap to register CORS middleware
cds.on('bootstrap', (app) => {
  app.use((req, res, next) => {
    // Permit any origin during local demo development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    
    // Explicitly allow Content-Type and custom auth/role headers
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-id, x-user-role');
    
    // Intercept preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-id, x-user-role'
      });
      res.end();
      return;
    }
    
    next();
  });
});

export default cds.server;
