import cds from '@sap/cds';

export default class AdminService extends cds.ApplicationService {
    async init() {
        // Bootstrap seed check for PURCHASER role and purchaser1 user if missing from DB
        await (async () => {
            try {
                let pRole = await SELECT.one.from('sap.production.portal.Roles').where({ code: 'PURCHASER' });
                if (!pRole) {
                    const roleId = 'f58913b7-7819-4d6b-912a-8991471b0213';
                    await INSERT.into('sap.production.portal.Roles').entries({
                        ID: roleId,
                        code: 'PURCHASER',
                        name: 'Purchaser',
                        description: 'Purchasing and Goods Issue Management'
                    });
                    pRole = { ID: roleId };
                }

                let pUser = await SELECT.one.from('sap.production.portal.Users').where({ username: 'purchaser1' });
                if (!pUser) {
                    const userId = 'e98124b2-8419-4a92-912a-8991471b0214';
                    await INSERT.into('sap.production.portal.Users').entries({
                        ID: userId,
                        username: 'purchaser1',
                        passwordHash: 'purchaser123',
                        email: 'purchaser1@manufacturing.com',
                        name: 'Purchaser',
                        department: 'Purchasing'
                    });
                    pUser = { ID: userId };
                }

                const pUserRole = await SELECT.one.from('sap.production.portal.UserRoles').where({ user_ID: pUser.ID });
                if (!pUserRole) {
                    await INSERT.into('sap.production.portal.UserRoles').entries({
                        ID: 'c58913b7-7819-4d6b-912a-8991471b0215',
                        user_ID: pUser.ID,
                        role_ID: pRole.ID
                    });
                }
            } catch (err) {
                console.error('[PURCHASER BOOTSTRAP SEED ERROR]', err);
            }
        })();

        this.on('login', async (req) => {
            const { username, passwordHash } = req.data;
            
            // Search user
            const user = await SELECT.one.from('sap.production.portal.Users')
                .where({ username });

            if (!user) {
                return req.reject(401, 'Invalid username or password');
            }

            // Verify password hash
            if (user.passwordHash !== passwordHash) {
                return req.reject(401, 'Invalid username or password');
            }

            // Fetch user's role mapping
            const userRole = await SELECT.one.from('sap.production.portal.UserRoles')
                .where({ user_ID: user.ID });
            
            let roleCode = 'PROD_OPERATOR';
            if (userRole) {
                const role = await SELECT.one.from('sap.production.portal.Roles')
                    .where({ ID: userRole.role_ID });
                if (role) {
                    roleCode = role.code;
                }
            }

            // Generate mock session token
            const token = Buffer.from(JSON.stringify({ userId: user.ID, role: roleCode })).toString('base64');

            // Log the login audit event
            await INSERT.into('sap.production.portal.AuditLogs').entries({
                user_ID: user.ID,
                action: 'USER_LOGIN',
                entityName: 'Users',
                entityId: user.ID,
                oldValues: '',
                newValues: JSON.stringify({ username, loginTime: new Date().toISOString() })
            });

            return {
                success: true,
                token: token,
                user: {
                    ID: user.ID,
                    username: user.username,
                    name: user.name,
                    role: roleCode,
                    department: user.department
                }
            };
        });

        await super.init();
    }
}
