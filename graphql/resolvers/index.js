const usersResolver = require('./users');
const messagesResolver = require('./messages');
const { Message,User } = require('../../models');

module.exports = {
    Message: {
        // we can change createdAt field in my Message type in typeDefs to ISOString 
        createdAt: (parent) => parent.createdAt.toISOString()
    },
    User: {
        // we can change createdAt field in my User type in typeDefs to ISOString 
        createdAt: (parent) => parent.createdAt.toISOString()
    },
    Reaction: {
        // we can change createdAt field in my User type in typeDefs to ISOString 
        createdAt: (parent) => parent.createdAt.toISOString(),
        message: async (parent) => await Message.findByPk(parent.messageId),
        user: async (parent) =>
        await User.findByPk(parent.userId, {
          attributes: ['username', 'imageUrl', 'createdAt'],
        }),
    },
    Query: {
        ...usersResolver.Query,
        ...messagesResolver.Query
    },
    Mutation: {
        ...usersResolver.Mutation,
        ...messagesResolver.Mutation
    },
    Subscription: {
        ...messagesResolver.Subscription
    }
}