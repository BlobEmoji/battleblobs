const StoreItem = require('../StoreItem.js');
class StatUpItem extends StoreItem {
  constructor(context, item) {
    super(context, item);
  }
  async getFields() {
    const stat_name = (await this.connection.getStatTypes())[this.item.potential - 1].stat_name;
    const fields = await super.getFields();
    fields.push({
      name: 'Stat improved',
      value: stat_name.charAt(0).toUpperCase() + stat_name.slice(1),
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
module.exports = StatUpItem;
