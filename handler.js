'use strict';

const aws = require('aws-sdk');
const _ = require('highland');
const uuid = require('uuid');

module.exports.producer = (event, context, callback) => {
  console.log('event: %j', event)

  const item = JSON.parse(event.body)

  const streamEvent = {
    id: uuid.v1(),
    type: 'listing-created',
    timestamp: Date.now(),
    item
  };

  const params = {
    StreamName: process.env.STREAM_NAME,
    PartitionKey: item.id,
    Data: new Buffer.from(JSON.stringify(streamEvent)),
  };

  console.log('producer kinesis params: %j', params)

  const kinesis = new aws.Kinesis()

  kinesis.putRecord(params).promise()
    .then(resp => callback(null, {
      statusCode: 202,
      headers: {
        'access-control-allow-origin': '*', // CORS support
        'cache-control': 'no-cache',
      },
    }))
    .catch(err => callback(err))
}

module.exports.createMailbox = (event, context, callback) => {
  console.log('createMailbox stream event: %j', event);

  _(event.Records)
    .map(mapRecordToUow)
    .tap(uow => console.log('createMailbox record ==> Uow: %j', uow))
    .filter(filterForListingCreated)
    //.tap(itsAllGonePeteTong)
    .map(processMailbox)
    .flatMap(publishMailboxCreated)
    .collect()
    .toCallback(callback);
}

const mapRecordToUow = (record) => ({ event: JSON.parse(new Buffer.from(record.kinesis.data, 'base64')) })

const filterForListingCreated = (uow) => uow.event.type === 'listing-created'

const itsAllGonePeteTong = () => {
  throw new Error('Something happened and it\'s probably not what you wanted.')
}

const processMailbox = (uow) => {
  uow.mailbox = uow.event.item.email

  return uow
}

const publishMailboxCreated = (uow) => {
  const item = {
    id: uow.event.item.id,
    mailbox: uow.mailbox
  }

  const streamEvent = {
    id: uuid.v1(),
    type: 'mailbox-created',
    timestamp: Date.now(),
    item
  };

  const params = {
    StreamName: process.env.STREAM_NAME,
    PartitionKey: item.id,
    Data: new Buffer.from(JSON.stringify(streamEvent)),
  };

  console.log('mailbox created kinesis params: %j', params)

  const kinesis = new aws.Kinesis()

  return _(kinesis.putRecord(params).promise())
}

module.exports.updateListing = (event, context, callback) => {
  _(event.Records)
    .map(mapRecordToUow)
    .tap(uow => console.log('updateListing record ==> UoW: %j', uow))
    .filter(filterForMailboxCreated)
    .flatMap(updateListingWithMailbox)
    .collect()
    .toCallback(callback);
}

const filterForMailboxCreated = (uow) => uow.event.type === 'mailbox-created'

const updateListingWithMailbox = (uow) => {
  //TODO:Update listing's mailbox
  return _(Promise.resolve({}))
}