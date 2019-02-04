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

  const params = {
    TableName: process.env.TRANSACTION_TABLE,
    Item: item,
  };

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
  .tap(r => console.log('record: %j', r))
  //.map(covertToJSON)
  //.flatMap(putObject)
  .collect()
  .toCallback(callback)
}

const publishEvent = (record) => {
  //TODO: CREATE item FROM RECORD

  const streamEvent = {
    id: uuid.v1(),
    type: 'transaction-created',
    timestamp: Date.now(),
    item
  }

  console.log('kinesis event: %j', streamEvent)

  const params = {
    StreamName: process.env.STREAM_NAME,
    PartitionKey: item.id,
    Data: new Buffer.from(JSON.stringify(streamEvent)),
  }

  return _(kinesis.putRecord(params).promise())
}

module.exports.subscribe = (event, context, callback) => {

}