import { UserModel } from "../models/user.model.js";

export const listDeletedUsers = () => UserModel.find(
	{},
	{ onlyDeleted: true }
);

export const listUsersIncludingDeleted = () => UserModel.find(
	{}, { withDeleted: true }
);

export async function restoreUser(
  email: string
) {
  const normalizedEmail =
    email
      .trim()
      .toLowerCase();

  /*
   * Verify that the user actually exists
   * in the soft-deleted state.
   */
  const deletedUser =
    await UserModel.findOne(
      {
        email: normalizedEmail
      },
      {
        onlyDeleted: true
      }
    );

  if (!deletedUser) {
    throw new Error(
      `Deleted user "${normalizedEmail}" was not found.`
    );
  }

  /*
   * restoreOne() resets the configured
   * soft-delete fields.
   */
  await UserModel.restoreOne({
    email: normalizedEmail,
    isDeleted: true
  });

  /*
   * Verify the user is visible again
   * through the normal active-user policy.
   */
  const restoredUser =
    await UserModel.findOne({
      email: normalizedEmail
    });

  if (!restoredUser) {
    throw new Error(
      `User "${normalizedEmail}" could not be restored.`
    );
  }

  return restoredUser;
}

export async function softDeleteUser(
	email: string
) {
	const normalizedEmail =
		email
			.trim()
			.toLowerCase();

	const user =
		await UserModel.findOne({
			email: normalizedEmail
		});

	if (!user) {
		throw new Error(
			`Active user "${normalizedEmail}" was not found.`
		);
	}

	await UserModel.deleteOne({
		email: normalizedEmail
	});

	return user;
}

export async function purgeUser(
	email: string
) {
	const normalizedEmail =
		email
			.trim()
			.toLowerCase();

	/*
	 * Verify that a SOFT-DELETED user
	 * actually exists before purging.
	 */
	const user =
		await UserModel.findOne(
			{
				email: normalizedEmail
			},
			{
				onlyDeleted: true
			}
		);

	if (!user) {
		throw new Error(
			`Deleted user "${normalizedEmail}" was not found.`
		);
	}

	/*
	 * hardDelete flows into the middleware
	 * context, causing beforeDeleteOne()
	 * to leave the delete physical.
	 */
	await UserModel.deleteOne(
		{
			email: normalizedEmail,
			isDeleted: true
		},
		{
			hardDelete: true
		}
	);

	return user;
}