const { User, Message } = require('../../models');
const bcrypt = require('bcryptjs');
const { UserInputError, AuthenticationError } = require('apollo-server-express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../config/env.json');
const { Op } = require('sequelize');

module.exports = {
  Query: {

    getUsers: async(_,__,{user}) => {
      
      try {
        if(!user) throw new AuthenticationError('Unauthorized User');
        
        // fetch all users without the current user
        let users = await User.findAll({
          attributes: ['username', 'imageUrl', 'createdAt'],
          where: {username: {
            [Op.ne]: user.username
          }}
        });

        const allUserMessages = await Message.findAll({
          where: {
            [Op.or]: [{from:user.username},{to: user.username}]
          },
          order: [['createdAt','DESC']]
        })
console.log('All User Message : ',allUserMessages);
        users = users.map((otherUser)=> {
          const latestMessage = allUserMessages.find(
            (m)=> m.from === otherUser.username || m.to === otherUser.username
          )
          console.log('Latest Message : ',latestMessage);
          otherUser.latestMessage = latestMessage;
          return otherUser;
        })
        return users;

      } catch (err) {
        console.log(err);
        throw err;
      }
    },
    login: async (_,args) => {
      let errors = {};
      const { username, password} = args;
      if(username.trim() === '') errors.username = 'The username can not be empty!!';
      if(password.trim() === '') errors.password = 'The password can not be empty!!';
      if(Object.keys(errors).length > 0){
        throw new UserInputError('bad input',{errors});
      }

      try {
        const user = await User.findOne({where:{username}});
        if(!user){
          errors.username = 'The username is not exist!!';
          throw new UserInputError('The username is not exist!!',{errors});
        }
        const equal = await bcrypt.compareSync(password,user.password);
        if(!equal){
          errors.password = 'The password is incorrect!!';
          throw new UserInputError('The password is incorrect!!',{errors});
        }
        const token = jwt.sign({username},JWT_SECRET,{expiresIn: '1h'});
        return {
          ...user.toJSON(),
          createdAt: user.createdAt,
          token
        }       
      } catch (err) {
        throw new UserInputError('Errors',{errors})
      }
       
    }
  },
  Mutation: {
    register: async(_,args) => {
      const {username, email, password, confirmPassword} = args
      let errors = {}      

      try {
        if(username.trim() === '') errors.username = 'The username can not be empty!!' 
        if(email.trim() === '') errors.email = 'The email can not be empty!!' 
        if(password.trim() === '') errors.password = 'The password can not be empty!!' 
        if(confirmPassword.trim() === '') errors.confirmPassword = 'The repeat password can not be empty!!' 
        const emailExist = await User.findOne({where: {email}})
        const usernameExist = await User.findOne({where: {username}})
        if(emailExist) errors.email = 'This email is already exist!!'
        if(usernameExist) errors.username = 'This username is already exist!!'
        if(password !== confirmPassword) errors.password = 'The password is not match!!'

        if(Object.keys(errors).length > 0) throw errors

        const hashedPass = await bcrypt.hash(password,12)
        const user = await User.create({
          username,
          email,
          password: hashedPass
        })
        return user
      } catch (err) {
        console.log(err)
        if(err.name === 'SequelizeUniqueConstraintError'){
          err.errors.forEach(
            (e)=> (errors[e.path] = `${e.path} is already taken`)
          )
        }else if(err.name === 'SequelizeValidationError'){
          err.errors.forEach(e => errors[e.path] = e.message)
        }
        throw new UserInputError('bad Input',{errors})
      }
    }
  }

}