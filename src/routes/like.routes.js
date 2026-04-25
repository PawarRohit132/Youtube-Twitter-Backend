import { Router } from "express";
import {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
} from "../controllers/like.controller.js"

import {verifyJWT} from "../middlewares/auth.middlerware.js"

const router = Router();

router.use(verifyJWT);


router.route("/toggel/v/:videoId").post(toggleVideoLike);
router.route("/toggel/c/:commentId").post(toggleCommentLike);
router.route("/toggel/t/:tweetId").post(toggleTweetLike);
router.route("/videos").get(getLikedVideos);

export default router