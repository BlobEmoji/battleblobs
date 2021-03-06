const StoreItem = require('../StoreItem.js');
class PotionItem extends StoreItem {
  constructor(context, item) {
    super(context, item);
  }
  async getFields() {
    const fields = await super.getFields();
    fields.push({
      name: 'Number of health points healed',
      value: this.item.potential,
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
module.exports = PotionItem;
