const StoreItem = require('../StoreItem.js')
class ReviveItem extends StoreItem {
    constructor(connection, item) {
        super(connection, item);
    }
    async getFields() {
        let fields = await super.getFields();
        fields.push({
            name: 'Percent of health healed',
            value: this.item.potential + '%',
            inline: true
        });
        fields.push({
            name: 'Description',
            value: this.item.description
        });
        return fields;
    }
    async getOptions() {
        return await super.getOptions();
    }
}
module.exports = ReviveItem;