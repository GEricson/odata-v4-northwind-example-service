const express = require('express');

const url = require('url');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

const odataController = require('./../controllers/odata');

const router = express.Router();

router.get('/', odataController.getEntitySetsInformation);
router.get('/\\$metadata', odataController.getMetadata);
router.post('/initDb', odataController.initDb);

router.get('/*', odataController.getEntities);
router.post('/*', odataController.postEntity);
router.put('/*', odataController.putEntity);
router.patch('/*', odataController.patchEntity);
router.delete('/*', odataController.deleteEntity);

module.exports = router;