const StoreItem = require('../StoreItem.js')
class TmItem extends StoreItem {
    constructor(context, item) {
        super(context, item);
        this.move = null;
    }
    async getFields() {
        this.move = await this.connection.getMove(this.item.potential);
        let fields = await super.getFields();
        fields.push({
            name: 'Power',
            value: this.move.damage,
            inline: true
        });
        fields.push({
            name: 'Accuracy',
            value: this.move.accuracy*100 + '%',
            inline: true
        });
        fields.push({
            name: 'Power Points',
            value: this.move.max_pp,
            inline: true
        });
        fields.push({
            name: 'Move Description',
            value: this.move.description,
            inline: true
        });
        fields.push({
            name: 'Original Move',
            value: this.move.original_move ? 'Yes' : 'No',
            inline: true
        });
        fields.push({
            name: 'Description',
            value: this.item.description
        });
        return fields;
    }
    async getOptions() {
        if (this.move.original_move) {
            let options = await super.getOptions();
            options.push('See blobs that can use this move');
            return options
        }
        return await super.getOptions();
    }
}
module.exports = TmItem;