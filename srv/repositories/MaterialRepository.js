import BaseRepository from './BaseRepository.js';

export default class MaterialRepository extends BaseRepository {
    constructor() {
        super('sap.production.portal.Materials');
    }

    async getBOMAndComponents(materialId, plantId) {
        return await SELECT.one.from('sap.production.portal.BOMs')
            .where({ material_ID: materialId, plant_ID: plantId })
            .columns(b => {
                b('*'),
                b.components(c => { c('*') })
            });
    }

    async getRoutingAndOperations(materialId, plantId) {
        return await SELECT.one.from('sap.production.portal.Routings')
            .where({ material_ID: materialId, plant_ID: plantId })
            .columns(r => {
                r('*'),
                r.operations(o => { o('*') })
            });
    }
}
