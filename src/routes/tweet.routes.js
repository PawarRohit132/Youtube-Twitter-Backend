import { Router } from "express";
import {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
} from "../controllers/tweet.controller.js"
import {verifyJWT} from "../middlewares/auth.middlerware.js"

const router = Router();

router.use(verifyJWT);

router.route("/").post(createTweet);
router.route("/user/:userId").post(getUserTweets);
router.route("/:userId").patch(updateTweet).delete(deleteTweet);

export default router