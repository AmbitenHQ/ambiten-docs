import {
  AmbitenClient
} from "@ambiten/core";

interface User {
  name: string;
  email: string;
  createdAt: Date;
}

const uri =
  process.env.MONGO_URI ??
  "mongodb://127.0.0.1:27017";

const dbName =
  process.env.DB_NAME ??
  "ambiten_tutorial";

const client =
  new AmbitenClient({
    uri,
    options: {
      dbName
    }
  });

async function main() {
  await client.connect();

  console.log(
    "Connected to MongoDB through AmbitenClient."
  );

  try {
    const users =
      await client.collection<User>(
        "users"
      );

    const email =
      "amina@team.io";

    await users.deleteMany({
      email
    });

    const result =
      await users.insertOne({
        name: "Amina",
        email,
        createdAt: new Date()
      });

    const user =
      await users.findOne({
        _id: result.insertedId
      });

    console.log(
      "User found:",
      user
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(
    "Tutorial failed:",
    error
  );

  process.exitCode = 1;
});
