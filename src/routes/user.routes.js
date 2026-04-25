import { Router } from "express";
import { registerUser, refreshAccessToken, changePasswordCurrent,
getCurrectUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage,
getUserChannelProfile, getWatchHistory } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { loginUser, logoutUser } from "../controllers/user.controller.js";
import {verifyJWT} from "../middlewares/auth.middlerware.js"

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name : "avatar",
            maxCount : 1
        },
        {
            name : "coverImage",
            maxCount : 1

        }
    ]),
    registerUser
)

router.route("/login").post(loginUser);
//secure route
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changePasswordCurrent);
router.route("/getcurrent-user").get(verifyJWT, getCurrectUser);
router.route("/update-account").patch(verifyJWT,updateAccountDetails);
router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)
router.route("/c/:username").get(verifyJWT, getUserChannelProfile)
router.route("/history").get(verifyJWT, getWatchHistory)

export default router