const { Message, User, Reaction } = require('../../models');
const { UserInputError, AuthenticationError, ForbiddenError } = require('apollo-server-express');
const { Op } = require('sequelize');
const { withFilter } = require('graphql-subscriptions');

// const { PubSub } = require('graphql-subscriptions')

// const pubsub = new PubSub()

module.exports = {
  Query: {

    getMessages: async (parent, {from}, {user}) => {

      try {

        if(!user) throw new AuthenticationError('Unauthorized User');
        const secondUser = await User.findOne({where: {username: from}});
        if(!secondUser) throw new UserInputError('user not found');
        if(secondUser.username === user.username) throw new UserInputError('You can\'t have a message between you and uourself !!');
        
        // Fetch all message between two user
        const usernames = [secondUser.username, user.username];
        const messages = await Message.findAll({where: {
          from: {[Op.in]: usernames},
          to: {[Op.in]:usernames}
        },
        order: [['createdAt','DESC']],
        include: [{model: Reaction, as:'reactions'}]
      });

        return messages;

      } catch (err) {
          console.log(err);
        throw err;
      }
    }
  },
  Mutation: {   

    sendMessage: async (_,{to, content},{user, pubsub}) => {      
      
      try {
        if(!user) throw new AuthenticationError('Unauthorized User');
        if(content.trim() === '') throw new UserInputError('Messages can not be empty!!');
        if(to.trim() === '') throw new UserInputError('User can not be empty!!');
        const recipient = await User.findOne({where: {username: to}});
        if(!recipient){
           throw new UserInputError('User not found!!');
        }else if(recipient.username === user.username) throw new UserInputError('you can\'t send message to yourself!!');
        const message = await Message.create({
          from: user.username,
          to,
          content
        })

        pubsub.publish('NEW_MESSAGE',{newMessage: message});
        console.log('pubsub = ');
        return message;
      } catch (err) {
          console.log(err);
        throw err;
      }
    },

    reactToMessage: async (_,{uuid, content},{ user, pubsub }) => {
      const reactions = ['❤️', '😆', '😯', '😢', '😡', '👍', '👎'];
      try {

        // Validate Reactions
        if(!reactions.includes(content))throw new UserInputError('invalid Reaction!!!')
        const username = user ? user.username : '';

        // Get User
        user = await User.findOne({where : {username}});
        if(!user)throw new AuthenticationError('Unauthentication !!');

        //Get Message
        const message = await Message.findOne({where: {uuid}});
        if(!message) throw new UserInputError('Message not found!!');

        if(message.from !== user.username && message.to !== user.username){
          throw new ForbiddenError('Unauthorized!!');
        }

        let reaction = await Reaction.findOne({where: {messageId:message.id,userId: user.id}});

        if(reaction){
          reaction.content = content;
          await reaction.save();
        }else{
          reaction = await Reaction.create({
            messageId: message.id,
            userId: user.id,
            content
          })
        }
        pubsub.publish('NEW_REACTION',{newReaction: reaction});
        return reaction;

      } catch (err) {
        throw err
      }
    }
  },

  Subscription: {

    newMessage: {
      subscribe: withFilter((_,__,{ user, pubsub}) => {
        if(!user) throw new AuthenticationError('Unauthentication !!!')
        return pubsub.asyncIterator(['NEW_MESSAGE']);
      },({newMessage},_,{user})=>{
        if(newMessage.from === user.username || newMessage.to === user.username){
          return true;
        }
        return false;
      })
    },
    newReaction: {
      subscribe: withFilter((_,__,{ user, pubsub}) => {
        if(!user) throw new AuthenticationError('Unauthentication !!!')
        return pubsub.asyncIterator(['NEW_REACTION']);
      },async ({newReaction},_,{user})=>{
        const message = await newReaction.getMessage();
        console.log('hiiiiiiiiiiii');
        console.log('messsage = ',message);
        if(message.from === user.username || message.to === user.username){
          return true;
        }
        return false;
      }),
    },

  }

}