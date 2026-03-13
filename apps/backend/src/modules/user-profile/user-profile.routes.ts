import { Router } from "express";
import { validateBody } from "../../core/middleware/validate";
import { userProfileController } from "./user-profile.controller";
import { updateUserProfileSchema } from "./user-profile.schemas";

export const userProfileRoutes = Router();

userProfileRoutes.get("/", userProfileController.getLocalProfile.bind(userProfileController));
userProfileRoutes.patch(
  "/",
  validateBody(updateUserProfileSchema),
  userProfileController.updateLocalProfile.bind(userProfileController)
);
