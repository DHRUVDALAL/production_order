import cds from '@sap/cds';

async function run() {
    try {
        await cds.connect.to('db');
        const users = await SELECT.from('sap.production.portal.Users');
        console.log('USERS IN DB:', users.map(u => ({ ID: u.ID, username: u.username, passwordHash: u.passwordHash })));
        
        const roles = await SELECT.from('sap.production.portal.Roles');
        console.log('ROLES IN DB:', roles);
    } catch (e) {
        console.error('Error querying DB:', e);
    }
}

run();
