import { Router } from "express";
import {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet,
    getAllTweets
} from "../controllers/tweet.controller.js"
import {verifyJWT} from "../middlewares/auth.middlerware.js"

const router = Router();

router.use(verifyJWT);

router.route("/").post(verifyJWT, createTweet);
router.route("/alltweets/user/:userId").get(verifyJWT, getAllTweets);
router.route("/user/:userId").get(verifyJWT, getUserTweets);
router.route("/:tweetId").patch(verifyJWT, updateTweet).delete(verifyJWT, deleteTweet);

export default router