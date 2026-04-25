import { Router } from "express";
import {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
} from "../controllers/subscription.controller.js"
import {verifyJWT} from "../middlewares/auth.middlerware.js"

const router = Router();

router.use(verifyJWT);

router.route("/c/t/:channelId").post(toggleSubscription)
router.route("/c/subscribedChannels/:channelId").get(getSubscribedChannels)
router.route("/c/userChannelSubscribers/:userId").get(getUserChannelSubscribers)

export default router