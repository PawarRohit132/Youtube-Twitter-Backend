import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
   
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    const video = await Video.findById(videoId)
   
    

    if (!video) {
        res.status(404)
        .json({
            success:false,
            message : "Video not found"
        })
    }

    const commentAggregate = Comment.aggregate([
        {
            $match : {
                video : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "owner"
            }
        },
        {
            $lookup : {
                from : "likes",
                localField : "_id",
                foreignField : "comment",
                as : "likes"

            }
        },
        {
            $addFields: {
                owner : {
                    $first : "$owner"
                },
                likesCount : {
                    $size : {
                        $filter : {
                            input: { $ifNull: ["$likes", []] },
                            as : "l",
                            cond : {$eq : ["$$l.type", "like"]}
                        }
                    }
                },
                dislikesCount : {
                    $size : {
                        $filter : {
                            input: { $ifNull: ["$likes", []] },
                            as : "l",
                            cond : {$eq : ["$$l.type", "dislike"]}
                        }
                    }
                },
                isLiked : {
                    $cond : {
                        if : {$in : [req.user._id, "$likes.likedBy"]},
                        then : true,
                        else : false
                    }
                },
                isDisLiked : {
                    $cond : {
                        if : {$in : [req.user._id, "$likes.likedBy"]},
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $sort : {
                createdAt : -1
            }
        },
        {
            $project : {
                content : 1,
                createdAt : 1,
                likesCount : 1,
                dislikesCount :1,
                owner : {
                    username : 1,
                    fullname : 1,
                    avatar : 1,
                },
                isLiked : 1,
                isDisLiked :1
            }
        }
    ]);

    const options = {
        page : parseInt(page, 10),
        limit : parseInt(limit, 10)
    }

    const comment = await Comment.aggregatePaginate(
        commentAggregate,
        options
    );


      return res
        .status(200)
        .json(new ApiResponse(200, comment, "Comments fetched successfully"));
});


const addComment = asyncHandler(async (req, res) => {

    const {videoId} = req.params;
    const {content} = req.body;

    if(!content){
        return res.status(400)
        .json({
            success : false,
            message : "content is required"
        })
    }

    const video = await Video.findById(videoId);

    if(!video){
        return res.status(404)
        .json({
            success : false,
            message : "video not found"
        })
    }


    const comment = await Comment.create({
        content,
        video : new mongoose.Types.ObjectId(videoId),
        owner : req.user._id
    })

    const populateComment = await Comment.findById(comment._id)
    .populate("owner", "username avatar");

    if(!comment){
        return res.status(500)
        .json({
            success : false,
            message : "something wents wrong while creating comment"
        })
    }

    return res.status(200)
    .json(
        new ApiResponse(200, populateComment, "comment added successfully")
    )
   



})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId} = req.params;
    const {content} = req.body;

    if(!content){
        throw new ApiError(400, "content is required")
    }

    const comment = await Comment.findById(commentId);

    if(comment.owner.toString() !== req.user._id.toString()){
        throw new ApiError(400, "you are not authorized to update this comment")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        comment?._id,
        {
            $set : {
                content
            }
        },
        {
            new : true
        }
    )

    if (!updatedComment) {
        throw new ApiError(500, "Failed to edit comment please try again");
    }
    

   return res.status(200)
    .json(
        new ApiResponse(200, updatedComment, "Comment updated successfully")
    )



})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment

    const {commentId} = req.params;

    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new ApiError(404, "Comment not found")
    }

    if(comment.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "You are not authorized to delete this comment");
    }

    await Comment.findByIdAndDelete(commentId)

    return res.status(200)
    .json(
        new ApiResponse(200, {commentId}, "Comment deleted successfully")
    )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }