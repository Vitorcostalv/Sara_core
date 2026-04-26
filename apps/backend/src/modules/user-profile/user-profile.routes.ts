import { Router } from "express";
import { asyncHandler } from "../../core/http/async-handler";
import { validateBody } from "../../core/middleware/validate";
import { userProfileController } from "./user-profile.controller";
import { updateUserProfileSchema } from "./user-profile.schemas";

export const userProfileRoutes = Router();

userProfileRoutes.get("/", asyncHandler(userProfileController.getLocalProfile.bind(userProfileController)));
userProfileRoutes.patch(
  "/",
  validateBody(updateUserProfileSchema),
  asyncHandler(userProfileController.updateLocalProfile.bind(userProfileController))
);
