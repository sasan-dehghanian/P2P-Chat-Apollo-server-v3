

const jwt = require('jsonwebtoken');
const {JWT_SECRET} = require('./config/env.json');
const { createServer } = require( "http");
const { execute, subscribe } = require( "graphql");
const { SubscriptionServer } = require( "subscriptions-transport-ws");
const { makeExecutableSchema } = require( "@graphql-tools/schema");
const express = require( "express");
const { ApolloServer } = require( "apollo-server-express");
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');
const contextMiddleware = require('./util/contextMiddleware');
const { sequelize } = require('./models');
const { PORT } = require('./config/env.json');



 
(async function () {
  
  const app = express(); 
  
  const httpServer = createServer(app);

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
    
  });
   
  const server = new ApolloServer({
    schema,      
    context: contextMiddleware,   
    plugins: [{
      async serverWillStart() {
        return { 
          async drainServer() {
            subscriptionServer.close();
          }
        }; 
      }
    }],
  }); 

  const subscriptionServer = SubscriptionServer.create(
    { schema, execute, subscribe,onConnect:contextMiddleware},
    { server: httpServer, path: server.graphqlPath }
  );   

  await server.start();
  server.applyMiddleware({app, path: '/graphql'});

  httpServer.listen(PORT, () => {
    sequelize.authenticate()
   .then(()=>console.log('DataBase Connected!!'))
   .catch(err => console.log(err))
    console.log(`Server is now running on http://localhost:${PORT}/graphql`)
  });
})();


