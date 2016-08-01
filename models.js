var mongoose = require('mongoose');
mongoose.connect('mongodb://jaystack:jaystack@localhost:27017/northwind');

var productSchema = mongoose.Schema({
  QuantityPerUnit: {type: String},
  UnitPrice: {type: Number, required: true},
  Name: {type: String},
  CategoryId: {type: mongoose.Schema.ObjectId}//, select: false}
}, {
  id: false
});

var categorySchema = mongoose.Schema({
  Description: {type: String, required: true},
  Name: {type: String, required: true}
}, {
  id: false
});

[productSchema, categorySchema].forEach(
  schema => schema.set("toJSON", {
    transform: (doc, ret, options) => {
      delete ret.__v;
    }
  })
);

/*productSchema.set("toJSON", {
    transform: (doc, ret, options) => {
      ret.CategoryId = ret.Category;
      delete ret.Category;
      delete ret.__v;
    }
});

categorySchema.set("toJSON", {
    transform: (doc, ret, options) => {
      delete ret.__v;
    }
});*/

var models = {
  Products: mongoose.model('Product', productSchema),
  Categories: mongoose.model('Category', categorySchema)
};

module.exports = models;