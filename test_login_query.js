import cds from '@sap/cds';

async function run() {
    try {
        await cds.connect.to('db');
        const username = 'planner1';
        
        // Exact query from srv/admin-service.js
        const user = await SELECT.one.from('sap.production.portal.Users')
            .where({ username })
            .columns(u => {
                u.ID, u.username, u.passwordHash, u.name, u.department,
                u.roles(ur => {
                    ur.role(r => { r.code })
                })
            });
            
        console.log('Query result:', user);
    } catch (e) {
        console.error('Query error:', e);
    }
}

run();
