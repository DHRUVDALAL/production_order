import cds from '@sap/cds';

async function run() {
    try {
        await cds.connect.to('db');
        const mappings = await SELECT.from('sap.production.portal.UserRoles');
        console.log('UserRoles mappings:', mappings);
        
        const operator = await SELECT.one.from('sap.production.portal.Users').where({ username: 'operator1' });
        console.log('Operator user ID:', operator.ID);
        
        const opRole = await SELECT.one.from('sap.production.portal.UserRoles').where({ user_ID: operator.ID });
        console.log('Operator UserRole mapping:', opRole);
        
        if (opRole) {
            const role = await SELECT.one.from('sap.production.portal.Roles').where({ ID: opRole.role_ID });
            console.log('Operator Role resolves to:', role.code);
        } else {
            console.log('Operator has NO UserRole mapping!');
        }
    } catch (e) {
        console.error(e);
    }
}
run();
