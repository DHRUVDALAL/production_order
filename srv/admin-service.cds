using { sap.production.portal as portal } from '../db/schema';

service AdminService {
    entity Plants as projection on portal.Plants;
    entity StorageLocations as projection on portal.StorageLocations;
    entity Materials as projection on portal.Materials;
    entity WorkCenters as projection on portal.WorkCenters;
    entity Routings as projection on portal.Routings;
    entity BOMs as projection on portal.BOMs;
    
    entity Users as projection on portal.Users;
    entity Roles as projection on portal.Roles;
    entity UserRoles as projection on portal.UserRoles;
    entity AuditLogs as projection on portal.AuditLogs;
    
    // Auth & administration helper
    action login(username: String, passwordHash: String) returns { 
        success: Boolean; 
        token: String; 
        user: { 
            ID: UUID; 
            username: String; 
            name: String; 
            role: String; 
            department: String; 
        }; 
    };
}
