const express = require('express');

const url = require('url');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

const odataController = require('./../controllers/odata');

const router = express.Router();

router.get('/', odataController.getEntitySets);
router.get('/\\$metadata', odataController.getMetadata);
router.post('/initDb', odataController.initDb);

router.get('/*', odataController.getItems);
router.post('/*', odataController.postItem);
router.put('/*', odataController.putItem);
router.patch('/*', odataController.patchItem);
router.delete('/*', odataController.deleteItem);

module.exports = router;