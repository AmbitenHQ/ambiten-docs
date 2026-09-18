import {
  client
} from "./core/db.js";

import {
  UserModel
} from "./models/user.model.js";

async function main() {
  await client.connect();

  console.log(
    "Connected to MongoDB."
  );

  try {
    const email =
      `amina.${Date.now()}@team.io`;

    const createdUser =
      await UserModel.create({
        name: "Amina",
        email,
        createdAt: new Date()
      });

    console.log(
      "Created user:",
      createdUser
    );

    const foundUser =
      await UserModel.findOne({
        email
      });

    console.log(
      "Found user:",
      foundUser
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
