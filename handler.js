'use strict';

const aws = require('aws-sdk');
const _ = require('highland');
const uuid = require('uuid');

module.exports.producer = (event, context, callback) => {
  console.log('event: %j', event)

  callback(null, null)
}