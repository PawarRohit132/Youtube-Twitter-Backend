import { Router } from "express";
import {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
} from "../controllers/subscription.controller.js"
import {verifyJWT} from "../middlewares/auth.middlerware.js"

const router = Router();

router.use(verifyJWT);

router.route("/c/:channelId").get(toggleSubscription).post(getSubscribedChannels)

export default router