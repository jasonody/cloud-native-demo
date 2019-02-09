'use strict'

const aws = require('aws-sdk')
const _ = require('highland')
const uuid = require('uuid')

const db = new aws.DynamoDB.DocumentClient()
const kinesis = new aws.Kinesis()

module.exports.command = (event, context, callback) => {
  console.log('event: %j', event)

  const item = JSON.parse(event.body)
  item.id = uuid.v4()
  item.mailbox = '|processing|'

  const params = {
    TableName: process.env.TRANSACTION_TABLE,
    Item: item,
  }

  console.log('dynamoDB params: %j', params)

  db.put(params).promise()
    .then(resp => callback(null, {
      statusCode: 201,
      headers: {
        'access-control-allow-origin': '*', // CORS support
        'cache-control': 'no-cache',
      },
    }))
    .catch(err => callback(err))
}

module.exports.publish = (event, context, callback) => {
  _(event.Records)
    .map(convertDynamoDBRecordToUoW)
    .tap(uow => console.log('uow: %j', uow))
    .flatMap(publishEvent)
    .collect()
    .toCallback(callback)
}

const convertDynamoDBRecordToUoW = (record) => {
  const uow = {
    event: record,
    item: {
      keys: aws.DynamoDB.Converter.unmarshall(record.dynamodb.Keys),
      oldImage: record.dynamodb.OldImage ? aws.DynamoDB.Converter.unmarshall(record.dynamodb.OldImage) : null,
      newImage: record.dynamodb.NewImage ? aws.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage) : null
    }
  }

  return uow
}

const TRANSACTION_EVENT_MAPPINGS = {
  'INSERT': 'transaction-created',
  'MODIFY': 'transaction-updated',
  'REMOVE': 'transcation-removed'
}

const publishEvent = (uow) => {
  const streamEvent = {
    id: uuid.v1(),
    type: TRANSACTION_EVENT_MAPPINGS[uow.event.eventName],
    timestamp: Date.now(),
    item: uow.item
  }

  console.log('kinesis event: %j', streamEvent)

  const params = {
    StreamName: process.env.STREAM_NAME,
    PartitionKey: uow.item.keys.id,
    Data: new Buffer.from(JSON.stringify(streamEvent)),
  }

  return _(kinesis.putRecord(params).promise())
}

module.exports.subscribe = (event, context, callback) => {
  _(event.Records)
    .map(convertKinesisRecordToUow)
    .tap(uow => console.log('uow: %j', uow))
    .filter(filterForMailboxCreated)
    .flatMap(updateTransactionMailbox)
    .collect()
    .toCallback(callback)
}

const convertKinesisRecordToUow = (record) => ({ event: JSON.parse(new Buffer.from(record.kinesis.data, 'base64')) })

const filterForMailboxCreated = (uow) => uow.event.type === 'mailbox-created'

const updateTransactionMailbox = (uow) => {
  var params = {
    TableName: process.env.TRANSACTION_TABLE,
    Key: { id : uow.event.item.newImage.id },
    UpdateExpression: 'SET #a = :a',
    ExpressionAttributeNames: {
      '#a': 'mailbox'
    },
    ExpressionAttributeValues: {
      ':a' : uow.event.item.newImage.mailbox
    }
  }

  console.log('params: %j', params)

  return _(db.update(params).promise())
}