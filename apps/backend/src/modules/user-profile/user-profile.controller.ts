import type { Request, Response } from "express";
import { sendOk } from "../../core/http/response";
import { userProfileService } from "./user-profile.service";
import type { UpdateUserProfileInput } from "./user-profile.schemas";

export class UserProfileController {
  async getLocalProfile(_req: Request, res: Response): Promise<void> {
    const profile = await userProfileService.getLocalProfile();
    sendOk(res, profile);
  }

  async updateLocalProfile(req: Request, res: Response): Promise<void> {
    const payload = req.body as UpdateUserProfileInput;
    const profile = await userProfileService.updateLocalProfile(payload);
    sendOk(res, profile);
  }
}

export const userProfileController = new UserProfileController();
