import { client } from "./core/db.js";
import { UserModel } from "./models/user.model.js";

async function main() {
  await client.connect();
  console.log("Connected to MongoDB.");
  try {
    const email = `amina.${Date.now()}@team.io`;
    const createdUser = await UserModel.create({
      name: "Amina",
      email,
      createdAt: new Date()
    });
    console.log("\nCREATE"); console.log(createdUser);

    const foundUser = await UserModel.findOne({ email });
    console.log("\nREAD ONE"); console.log(foundUser);

    const users = await UserModel.find({ email });
    console.log("\nREAD MANY"); console.log(users);

    await UserModel.updateOne(
      { email },
      {
        $set: {
          name: "Amina Yusuf"
        }
      });
    
    const updatedUser = await UserModel.findOne({ email });
    console.log("\nUPDATE"); console.log(updatedUser);

    await UserModel.deleteOne({ email });
    const deletedUser = await UserModel.findOne({ email });
    console.log("\nDELETE"); console.log(deletedUser);

  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Tutorial failed:", error);
  process.exitCode = 1;
});
