import cds from '@sap/cds';

export default class BaseRepository {
    constructor(entityName) {
        this.entityName = entityName;
    }

    async selectAll() {
        return await SELECT.from(this.entityName);
    }

    async selectById(id) {
        return await SELECT.one.from(this.entityName).where({ ID: id });
    }

    async selectBy(query) {
        return await SELECT.from(this.entityName).where(query);
    }

    async create(data) {
        return await INSERT.into(this.entityName).entries(data);
    }

    async update(id, data) {
        return await UPDATE(this.entityName).set(data).where({ ID: id });
    }

    async delete(id) {
        return await DELETE.from(this.entityName).where({ ID: id });
    }
}
