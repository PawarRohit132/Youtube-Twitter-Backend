import { Router } from "express";
import {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
} from "../controllers/playlist.controller.js"
import {verifyJWT} from "../middlewares/auth.middlerware.js"


const router = Router();

router.use(verifyJWT);

router.route("/").post(createPlaylist)

router
    .route("/:playlistId")
    .get(getPlaylistById)
    .patch(updatePlaylist)
    .delete(deletePlaylist)
  
router.route("/add/:videoId/:playlistId").patch(addVideoToPlaylist)
router.route("/remove/:videoId/:playlistId").patch(removeVideoFromPlaylist) 

export default router