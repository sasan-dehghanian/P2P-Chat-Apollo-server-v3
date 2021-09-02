const jwt = require('jsonwebtoken')
const { JWT_SECRET } = require('../config/env.json')
const { PubSub } = require('graphql-subscriptions')

const pubsub = new PubSub()

module.exports = (context) => {
  let token
  if (context.req && context.req.headers.authorization) {
    token = context.req.headers.authorization.split('Bearer ')[1]
    

  }else if (context.Authorization) {
    token = context.Authorization.split('Bearer ')[1]
  }

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decodedToken) => {
      context.user = decodedToken
    })
  }
  

  context.pubsub = pubsub

console.log('context.user = ',context.user);
  return context
}
