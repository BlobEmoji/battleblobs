
class StoreItem {
    constructor(connection, item) {
        this.connection = connection;
        this.item = item;
    }
    async getFields() {
        return [
            {
                name: 'Name',
                value: this.item.name,
                inline: true
            }, 
            {
                name: 'Price',
                value: this.item.value + '<:blobcoin:386670804865384458>',
                inline: true
            }, 
            {
                name: 'Category',
                value: this.item.category,
                inline: true
            }
        ]
    }
    async getOptions() {
        return ['Buy', 'Buy 5', 'Buy 10', 'Back'];
    }
}
module.exports = StoreItem;