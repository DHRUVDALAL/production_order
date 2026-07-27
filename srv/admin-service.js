import cds from '@sap/cds';

export default class AdminService extends cds.ApplicationService {
    async init() {
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
