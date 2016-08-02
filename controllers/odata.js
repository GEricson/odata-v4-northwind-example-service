const url = require('url');

const config = require('./../config');

const mongoose = require('mongoose');
mongoose.connect(config.dbUrl);

const ObjectId = require('mongoose').Types.ObjectId;

const createQuery = require('odata-v4-mongodb').createQuery;
const createFilter = require('odata-v4-mongodb').createFilter;
const createServiceOperationCall = require('odata-v4-resource/lib/index').createServiceOperationCall;

const categoriesBackup = require('./../database_backup/northwindCategories.js');
const productsBackup = require('./../database_backup/northwindProducts.js');

const models = require('./../models')(mongoose);
const metadata = require('./../metadata');

function getEntitySetNameFromRequest(req){
  const call = createServiceOperationCall(req.originalUrl, metadata);

  if( !call ||
      !call.navigation ||
       call.navigation.length < 1 ||
      !call.navigation[call.navigation.length-1].name
  ){
    return null;
  }

  return call.navigation[call.navigation.length-1].name;
}

function getEntityKeyFromRequest(req){
  const call = createServiceOperationCall(req.originalUrl, metadata);

  if( !call ||
      !call.navigation || 
      !call.navigation[0] ||
      !call.navigation[0].key ||
      !call.navigation[0].key[0] ||
      !call.navigation[0].key[0].value
  ){
    return null;
  }

  return call.navigation[0].key[0].value.toString()
}

function respondNotFound(res){
  res.sendStatus(404);
}

function createQueryObjectFromRequest(req){
  const call = createServiceOperationCall(req.originalUrl, metadata);

  const queryObject = {
    query: {},
    fields: {},
    options: {}
  };

  const queryString = url.parse(req.url).query;
  if(queryString){
    const query = createQuery(queryString);
    queryObject.query = query.query;
    queryObject.fields = query.projection;
    queryObject.options.sort = query.sort;
    queryObject.options.skip = query.skip;
    queryObject.options.limit = query.limit;
  }

  if(call.navigation.length > 1){
    queryObject.query[models[call.navigation[0].name].modelName + "Id"] = call.navigation[0].key[0].value.toString(); //We have to append "Id" to modelName because we store the Product's category id in the "CategoryId" field.
  }

  if(call.navigation[call.navigation.length-1].key &&
     call.navigation[call.navigation.length-1].key[0]
  ){
    queryObject.query["_id"] = new ObjectId(call.navigation[call.navigation.length-1].key[0].value.toString());
  }

  return queryObject;
}

function getModelFromRequest(req){
  const entitySetName = getEntitySetNameFromRequest(req);
  if(!entitySetName){
    return null;
  }

  const model = models[entitySetName];
  if(!model){
    return null;
  }

  return model;
}

const odataController = {
  
  getMetadata: metadata.requestHandler(),

  getEntitySets: function(req, res, next){
    res.set('OData-Version', '4.0');
    res.json({'@odata.context': req.protocol + '://' + req.get('host') + '/odata/$metadata',
      value: [
        {
          name: 'Products',
          kind: 'EntitySet',
          url:  'Products'
        },
        {
          name: 'Categories',
          kind: 'EntitySet',
          url:  'Categories'
        }
      ]
    });
  },

  initDb: function(req, res, next){
    models["Products"].remove({})
    .then(
      () => models['Categories'].remove({})
    )
    .then(
      () => models['Products'].insertMany(productsBackup) 
    )
    .then(
      () => models['Categories'].insertMany(categoriesBackup)
    )
    .then(
      () => {
        res.sendStatus(200);
      }
    )
    .catch(
      (err) => {
        res.status = 500;
        res.send(err);
      }
    );
  },

  getItems: function(req, res, next){
    const model = getModelFromRequest(req);
    if(!model){
      respondNotFound();
    }

    const queryObject = createQueryObjectFromRequest(req);

    const mongooseQuery = model.find(queryObject.query, queryObject.fields)
    if(queryObject.options.sort){
      mongooseQuery.sort(queryObject.options.sort);
    }
    if(queryObject.options.skip){
      mongooseQuery.skip(queryObject.options.skip);
    }
    if(queryObject.options.limit){
      mongooseQuery.limit(queryObject.options.limit);
    }
    
    mongooseQuery.exec(function(err, data){
      if(err){
        console.error(err);
        return next(err);
      }

      if( Object.keys(queryObject.fields).length != 0 &&
          Object.keys(queryObject.fields).findIndex(e => e == "_id") == -1
      ){
        data = data.map(e => {
          const entity = e.toObject();
          delete entity._id;
          return entity;
        });
      }

      res.json({
        '@odata.context': req.protocol + '://' + req.get('host') + '/odata/$metadata#' + model.modelName,
        value: data
      });
    });
  },

  postItem: function(req, res, next){
    const model = getModelFromRequest(req);
    if(!model){
      respondNotFound();
    }

    const entity = new model(req.body);
    entity.save((result) => {
      res.status(201);
    });
  },

  putItem: function(req, res, next){
    const model = getModelFromRequest(req);
    if(!model){
      respondNotFound();
    }

    model.findOneAndUpdate({'_id': entityDescriptor.key}, req.body, {}, (err, data) => {
      if(err){
        res.send(500, {error: err});
        return;
      }
      res.send("success!");
    });
  },

  patchItem: function(req, res, next){
    const model = getModelFromRequest(req);
    if(!model){
      respondNotFound();
    }

    const entityKey = getEntityKeyFromRequest(req);

    model.findOneAndUpdate({'_id': entityKey}, {"$set": req.body}, {}, (err, data) => {
      if(err){
        res.send(500, {error: err});
        return;
      }
      res.send("success!");
    });
  },

  deleteItem: function(req, res, next){
    const model = getModelFromRequest(req);
    if(!model){
      respondNotFound();
    }

    const entityKey = getEntityKeyFromRequest(req);
    if(!entityKey){
      res.sendStatus(400);
      return;
    }

    model.findOneAndRemove({"_id": entityKey}, (err, data) => {
      if(err){
        next(err);
      }

      if(!data){
        res.sendStatus(404);
      }
      else{
        res.sendStatus(204);
      }
    });
  }

}

module.exports = odataController;