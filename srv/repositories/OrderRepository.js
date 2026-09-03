import BaseRepository from './BaseRepository.js';

export default class OrderRepository extends BaseRepository {
    constructor() {
        super('sap.production.portal.ProductionOrders');
    }

    async selectWithOperationsAndComponents(id) {
        return await SELECT.one.from(this.entityName)
            .where({ ID: id })
            .columns(o => {
                o('*'),
                o.operations(op => { op('*') }),
                o.components(c => { c('*') })
            });
    }

    async selectWithAllDetails(id) {
        return await SELECT.one.from(this.entityName)
            .where({ ID: id })
            .columns(o => {
                o('*'),
                o.material(m => { m('*') }),
                o.plant(p => { p('*') }),
                o.storageLocation(s => { s('*') }),
                o.operations(op => { op('*') }),
                o.components(c => { c('*') }),
                o.goodsMovements(gm => { 
                    gm('*'),
                    gm.material(m => { m('*') }),
                    gm.plant(p => { p('*') }),
                    gm.storageLocation(s => { s('*') })
                })
            });
    }
}
