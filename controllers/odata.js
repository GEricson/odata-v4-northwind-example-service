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
    //We have to append "Id" to modelName because we store the Product's category id in the "CategoryId" field.
    queryObject.query[models[call.navigation[0].name].modelName + "Id"] = call.navigation[0].key[0].value.toString();
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

function getNumberOfResourcelevelsFromRequest(req){
  try{
    const call = createServiceOperationCall(req.originalUrl, metadata);
  }
  catch(err){
    return null
  }

  return call.navigation.length;
}

const odataController = {
  
  getMetadata: metadata.requestHandler(),

  getEntitySetsInformation: function(req, res, next){
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

  //Clearing "Categories" and "Products" collections and restore them from backup
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

  //Returns an entitySet. Supports 2-level resource URI-s and odata queries
  getEntities: function(req, res, next){
    const numberOfLevelsOfRequestedResource = getNumberOfResourcelevelsFromRequest(req);

    if(!numberOfLevelsOfRequestedResource){
      res.sendStatus(400);
    }

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

      //Mongoose always returns the _id with the document, 
      // so we have to remove it if there is a $select operator in the query that doesn't including the _id field 
      if( Object.keys(queryObject.fields).length != 0 &&
          Object.keys(queryObject.fields).findIndex(e => e == "_id") == -1
      ){
        data = data.map(e => {
          const entity = e.toObject(); //Converting mongoose document to plain javascript object
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

  //Creating an entity
  postEntity: function(req, res, next){
    const model = getModelFromRequest(req);
    if(!model){
      respondNotFound();
    }

    const entity = new model(req.body);
    entity.save((result) => {
      res.status(201);
    });
  },

  //Replace an entity
  putEntity: function(req, res, next){
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

  //Update an entity
  patchEntity: function(req, res, next){
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

  //Delete an entity
  deleteEntity: function(req, res, next){
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