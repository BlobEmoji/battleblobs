const StoreItem = require('../StoreItem.js');
class StatusHealItem extends StoreItem {
  constructor(context, item) {
    super(context, item);
  }
  async getFields() {
    const status_name = (await this.connection.getStatusTypes())[this.item.potential - 1].name;
    const fields = await super.getFields();
    fields.push({
      name: 'Status removed',
      value: status_name,
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
module.exports = StatusHealItem;
