var express = require('express');

var url = require('url');
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();

var ObjectId = require('mongoose').Types.ObjectId;

var createQuery = require('odata-v4-mongodb').createQuery;
var createFilter = require('odata-v4-mongodb').createFilter;
var createServiceOperationCall = require('odata-v4-resource/lib/index').createServiceOperationCall;

var models = require('./../models');
var metadata = require('./../metadata');

var router = express.Router();

function getEntityTypeNameAndKeyFromServiceOperationCall(serviceOperationCall){
  var entityDescriptor = {
    typeName: null,
    key: null
  };

  if(serviceOperationCall.navigation.length > 0){

    entityDescriptor.typeName = serviceOperationCall.navigation[0].name;

    if(serviceOperationCall.navigation[0].key){
      entityDescriptor.key = serviceOperationCall.navigation[0].key[0].value.toString();
    }

  }

  return entityDescriptor;
}

router.get('/', (req, res) => {
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
});

router.get('/\\$metadata', metadata.requestHandler());


router.get('initDb', (res, req, next) => {

});

router.get('/*', (req, res, next) => {
  var call = createServiceOperationCall(req.originalUrl, metadata);
  var entityDescriptor = getEntityTypeNameAndKeyFromServiceOperationCall(call);

  if(!call.navigation || call.navigation.length == 0){
    res.status(404);
  }

  var model = models[call.navigation[call.navigation.length-1].name];

  if(!model){
    res.status(404);
    res.end();
    return;
  }

  var find = {
    query: {},
    fields: {},
    options: {}
  };
  
  var queryString = url.parse(req.url).query;

  if(queryString){
    var query = createQuery(queryString);
    find.query = query.query;
    find.fields = query.projection;
    find.options.sort = query.sort;
    //find.option.skip = query.skip;
    find.options.limit = query.limit;
  }

  if(call.navigation.length > 1){
    var mainResource = call.navigation[0].name;
    find.query[models[call.navigation[0].name].modelName] = call.navigation[0].key[0].value.toString();
  }

  if(call.navigation[call.navigation.length-1].key && call.navigation[call.navigation.length-1].key[0]){
    try{
      find.query["_id"] = new ObjectId(call.navigation[call.navigation.length-1].key[0].value.toString());
    }
    catch(err){
      res.status(404);
      res.end();
      return;
    }
  }

  model.find(find.query, find.fields, find.option, function(err, data){
    if(err){
      console.error(err);
      return next(err);
    }

    res.json({
      '@odata.context': req.protocol + '://' + req.get('host') + '/odata/$metadata#' + entityDescriptor.typeName,
      value: data
    });
  });
});

router.post('/*', jsonParser, (req, res, next) => {
  var call = createServiceOperationCall(req.originalUrl, metadata);
  var entityDescriptor = getEntityTypeNameAndKeyFromServiceOperationCall(call);

  if(!entityDescriptor.typeName){
    next();
  }

  var model = models[entityDescriptor.typeName];

  var entity = new model(req.body);
  entity.save((result) => {
    if (req.headers.prefer && req.headers.prefer.indexOf('return=minimal') < 0){
			res.status(201);
			res.json(result);
		}else{
			res.status(204);
			res.end();
		}
  }, next);
});

router.put('/*', jsonParser, (req, res, next) => {
  var call = createServiceOperationCall(req.originalUrl, metadata);
  var entityDescriptor = getEntityTypeNameAndKeyFromServiceOperationCall(call);

  if(!entityDescriptor.typeName){
    next();
  }

  if(!entityDescriptor.key){
    next();
  }

  var model = models[entityDescriptor.typeName];

  model.findOneAndUpdate({'_id': entityDescriptor.key}, req.body, {}, (err, data) => {
    if(err){
      res.send(500, {error: err});
      return;
    }
    res.send("success!");
  });
});

router.patch('/*', jsonParser, (req, res) => {
  var call = createServiceOperationCall(req.originalUrl, metadata);
  var entityDescriptor = getEntityTypeNameAndKeyFromServiceOperationCall(call);

  if(!entityDescriptor.typeName){
    next();
  }

  if(!entityDescriptor.key){
    next();
  }

  var model = models[entityDescriptor.typeName];

  if(!call.navigation[0].key){
    next();
  }
  entityDescriptor.key = call.navigation[0].key[0].value.toString();

  model.findOneAndUpdate({'_id': entityDescriptor.key}, {"$set": req.body}, {}, (err, data) => {
    if(err){
      res.send(500, {error: err});
      return;
    }
    res.send("success!");
  });
});

router.delete('/*', jsonParser, (req, res, next) => {
  var call = createServiceOperationCall(req.originalUrl, metadata);
  var entityDescriptor = getEntityTypeNameAndKeyFromServiceOperationCall(call);

  if(!entityDescriptor.typeName){
    next();
  }

  if(!entityDescriptor.key){
    next();
  }

  var model = models[entityDescriptor.typeName];

  if(!call.navigation[0].key){
    next();
  }
  entityDescriptor.key = call.navigation[0].key[0].value.toString();

  model.findOneAndRemove({"_id": entityDescriptor.key}, (err, data) => {
    if(err){
      next(err);
    }

    if(!data){
      res.send(404);
    }
    else{
      res.send(204);
    }
  });
});

module.exports = router;