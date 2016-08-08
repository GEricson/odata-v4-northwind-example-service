module.exports = function(mongoose){
  const productSchema = mongoose.Schema({
    QuantityPerUnit: {type: String},
    UnitPrice: {type: Number, required: true},
    Name: {type: String},
    CategoryId: {type: mongoose.Schema.ObjectId}//, select: false}
  }, {
    id: false
  });

  const categorySchema = mongoose.Schema({
    Description: {type: String, required: true},
    Name: {type: String, required: true}
  }, {
    id: false
  });

  [productSchema, categorySchema].forEach(
    schema => schema.set("toJSON", {
      transform: (doc, ret, options) => {
        delete ret.__v; //mongoose internal revision key, we don't want to see that
      }
    })
  );

  const models = {
    Products: mongoose.model('Product', productSchema),
    Categories: mongoose.model('Category', categorySchema)
  };

  return models;
}