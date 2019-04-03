
class StoreItem {
  constructor(context, item) {
    this.context = context;
    this.connection = context.connection;
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
        value: this.item.value + this.context.client.config.emojis.coin_emoji,
        inline: true
      }, 
      {
        name: 'Category',
        value: this.item.category,
        inline: true
      }
    ];
  }
  async getOptions() {
    return ['Buy', 'Buy 5', 'Buy 10', 'Back'];
  }
}
module.exports = StoreItem;
