export const typeDefs = `#graphql
  type User {
    _id: ID!
    name: String!
    email: String!
  }

  type RuntimeContext {
    tenantId: String
    requestId: String
  }

  input CreateUserInput {
    name: String!
    email: String!
  }

  type Query {
    users: [User!]!
    runtime: RuntimeContext!
  }

  type Mutation {
    createUser(
      input: CreateUserInput!
    ): User!
  }
`;

// export const typeDefs = `#graphql
//   type User {
//     _id: ID!
//     name: String!
//     email: String!
//   }

//   type RuntimeContext {
//     tenantId: String
//     requestId: String
//     applicationName: String!
//   }

//   input CreateUserInput {
//     name: String!
//     email: String!
//   }

//   type Query {
//     users: [User!]!
//     runtime: RuntimeContext!
//   }

//   type Mutation {
//     createUser(input: CreateUserInput!): User!
//     createUserWithAudit(
//       input: CreateUserInput!
//       simulateFailure: Boolean = false
//     ): User!
//   }
// `;
