|identifier|Runner output| CQL Execution output|
|---|---|---|
|Active Pharmacotherapy for Tobacco Cessation| undefined |[] |
|Most Recent Tobacco Use Screening Indicates Tobacco Non User| undefined |null|
|Numerator 2| undefined |false|
|Numerator 3| undefined |false|
|Qualifying Visit During Measurement Period| undefined |[]|
|SDE Ethnicity| undefined |Tuple|
|SDE Payer| undefined |[]|
|SDE Race| undefined |Tuple|
|SDE Sex| undefined |null|
|Tobacco Cessation Counseling Given| undefined |[]|
|Tobacco Cessation Pharmacotherapy Ordered| undefined| []|


Active Pharmacotherapy for Tobacco Cessation
```
{
    "name": "Active Pharmacotherapy for Tobacco Cessation",
    "_valueBoolean": {
      "extension": [ {
        "url": "http://hl7.org/fhir/StructureDefinition/cqf-isEmptyList",
        "valueBoolean": true
      } ]
    }
  }
```

Most Recent Tobacco Use Screening Indicates Tobacco Non User
```
{
    "name": "Most Recent Tobacco Use Screening Indicates Tobacco Non User",
    "_valueBoolean": {
      "extension": [ {
        "url": "http://hl7.org/fhir/StructureDefinition/data-absent-reason",
        "valueCode": "unknown"
      } ]
    }
  }
```

Numerator 2
```
{
    "name": "Numerator 2",
    "valueBoolean": false
  }
```

Numerator 3
```
{
    "name": "Numerator 3",
    "valueBoolean": false
  }
```

Qualifying Visit During Measurement Period
```
{
    "name": "Qualifying Visit During Measurement Period",
    "_valueBoolean": {
      "extension": [ {
        "url": "http://hl7.org/fhir/StructureDefinition/cqf-isEmptyList",
        "valueBoolean": true
      } ]
    }
  }
```

SDE Ethnicity
```
{
    "name": "SDE Ethnicity",
    "part": [ {
      "name": "codes",
      "valueCoding": {
        "system": "urn:oid:2.16.840.1.113883.6.238",
        "code": "2135-2",
        "display": "Hispanic or Latino"
      }
    }, {
      "name": "display",
      "valueString": "Hispanic or Latino"
    } ]
  }
```

SDE Payer
```
{
    "name": "SDE Payer",
    "_valueBoolean": {
      "extension": [ {
        "url": "http://hl7.org/fhir/StructureDefinition/cqf-isEmptyList",
        "valueBoolean": true
      } ]
    }
  }
```

SDE Race
```
{
    "name": "SDE Race",
    "part": [ {
      "name": "codes",
      "valueCoding": {
        "system": "urn:oid:2.16.840.1.113883.6.238",
        "code": "2028-9",
        "display": "Asian"
      }
    }, {
      "name": "display",
      "valueString": "Asian"
    } ]
  }
```

SDE Sex
```
{
    "name": "SDE Sex",
    "_valueBoolean": {
      "extension": [ {
        "url": "http://hl7.org/fhir/StructureDefinition/data-absent-reason",
        "valueCode": "unknown"
      } ]
    }
  }
```

Tobacco Cessation Counseling Given
```
{
    "name": "Tobacco Cessation Counseling Given",
    "_valueBoolean": {
      "extension": [ {
        "url": "http://hl7.org/fhir/StructureDefinition/cqf-isEmptyList",
        "valueBoolean": true
      } ]
    }
  },
```

Tobacco Cessation Pharmacotherapy Ordered
```
{
    "name": "Tobacco Cessation Pharmacotherapy Ordered",
    "_valueBoolean": {
      "extension": [ {
        "url": "http://hl7.org/fhir/StructureDefinition/cqf-isEmptyList",
        "valueBoolean": true
      } ]
    }
  }
```

