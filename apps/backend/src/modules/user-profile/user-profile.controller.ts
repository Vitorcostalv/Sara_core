import type { Request, Response } from "express";
import { sendOk } from "../../core/http/response";
import { userProfileService } from "./user-profile.service";
import type { UpdateUserProfileInput } from "./user-profile.schemas";

export class UserProfileController {
  getLocalProfile(_req: Request, res: Response): void {
    const profile = userProfileService.getLocalProfile();
    sendOk(res, profile);
  }

  updateLocalProfile(req: Request, res: Response): void {
    const payload = req.body as UpdateUserProfileInput;
    const profile = userProfileService.updateLocalProfile(payload);
    sendOk(res, profile);
  }
}

export const userProfileController = new UserProfileController();
