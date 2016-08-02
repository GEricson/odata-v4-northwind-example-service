const ServiceMetadata = require('odata-v4-service-metadata').ServiceMetadata;

const schemaJson = {
  "version": "4.0",
  "dataServices": {
    "schema": [
      {
        "namespace": "Northwind",
        "entityType": [
          {
            "name": "Product",
            "key":  [
              {
                "propertyRef": [
                  {
                    "name": "_id"
                  }
                ]
              }
            ],
            "property": [
              {
                "name": "QuantityPerUnit",
                "type": "Edm.String",
                "nullable": "false"
              },
              {
                "name": "UnitPrice",
                "type": "Edm.Decimal",
                "nullable": "false"
              },
              {
                "name": "_id",
                "type": "Edm.String",
                "nullable": "false"
              },
              {
                "name": "Name",
                "type": "Edm.String",
                "nullable": "false"
              },
              {
                "name": "CategoryId",
                "type": "Edm.String",
                "nullable": "false"
              }
            ]/*,
            "navigationProperty": [
              {
                "name": "Category",
                "type": "Northwind.Category",
                "partner": "Products"
              }
            ]*/
          },
          {
            "name": "Category",
            "key":  [
              {
                "propertyRef": [
                  {
                    "name": "_id"
                  }
                ]
              }
            ],
            "property": [
              {
                "name": "Description",
                "type": "Edm.String",
                "nullable": "false"
              },
              {
                "name": "_id",
                "type": "Edm.String",
                "nullable": "false"
              },
              {
                "name": "Name",
                "type": "Edm.String",
                "nullable": "false"
              }
            ],
            "navigationProperty": [
              {
                "name": "Products",
                "type": "Collection(Northwind.Product)",
                "partner": "Category"
              }
            ]
          }
        ],
        "annotations": [
          {
            "target": "Northwind.Product/_id",
            "annotation": [
              {
                "term": "Org.OData.Core.V1.Computed",
                "bool": "true"
              },
              {
                "term": "UI.DisplayName",
                "string": "Product identifier"
              },
              {
                "term": "UI.ControlHint",
                "string": "ReadOnly"
              }
            ]
          },
          {
            "target": "Northwind.Category/_id",
            "annotation": [
              {
                "term": "Org.OData.Core.V1.Computed",
                "bool": "true"
              },
              {
                "term": "UI.DisplayName",
                "string": "Category identifier"
              },
              {
                "term": "UI.ControlHint",
                "string": "ReadOnly"
              }
            ]
          },
          {
            "target": "Northwind.Category",
            "annotation": [
              {
                "term": "UI.DisplayName",
                "string": "Categories"
              }
            ]
          },
          {
            "target": "Northwind.Category/Name",
            "annotation": [
              {
                "term": "UI.DisplayName",
                "string": "Category name"
              },
              {
                "term": "UI.ControlHint",
                "string": "ShortText"
              }
            ]
          },
          {
            "target": "Northwind.Product",
            "annotation": [
              {
                "term": "UI.DisplayName",
                "string": "Products"
              }
            ]
          },
          {
            "target": "Northwind.Product/Name",
            "annotation": [
              {
                "term": "UI.DisplayName",
                "string": "Product title"
              },
              {
                "term": "UI.ControlHint",
                "string": "ShortText"
              }
            ]
          },
          {
            "target": "Northwind.Product/QuantityPerUnit",
            "annotation": [
              {
                "term": "UI.DisplayName",
                "string": "Product English name"
              },
              {
                "term": "UI.ControlHint",
                "string": "ShortText"
              }
            ]
          },
          {
            "target": "Northwind.Product/UnitPrice",
            "annotation": [
              {
                "term": "UI.DisplayName",
                "string": "Unit price of product"
              },
              {
                "term": "UI.ControlHint",
                "string": "Decimal"
              }
            ]
          },
        ]
      },
      {
        "namespace": "Default",
        "action": {
          "name": "initDb"
        }
      }
    ]
  }
}

const metadata = ServiceMetadata.processMetadataJson(schemaJson);

module.exports = metadata;