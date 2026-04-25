import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { type } = req.body;

  if (!isValidObjectId(videoId)) {
    return res.status(200).json({
      success: false,
      message: "invalid videoId",
    });
  }

  if (!["like", "dislike"].includes(type)) {
    return res.status(400).json({
      success: false,
      message: "invalid type",
    });
  }

  const likedAlready = await Like.findOne({
    video: videoId,
    likedBy: req.user._id,
  });

  if (!likedAlready) {
    await Like.create({
      video: videoId,
      likedBy: req.user._id,
      type,
    });

    return res
      .status(200)
      .json(new ApiResponse( 200,{
        videoId,
        isLiked: type === "like",
        isDisliked: type === "dislike",
      }));
  }

  if (likedAlready.type === type) {
    await Like.findByIdAndDelete(likedAlready._id);

    return res
      .status(200)
      .json(
        new ApiResponse(200, { videoId, isLiked: false, isDisliked: false })
      );
  }

  likedAlready.type = type;
  await likedAlready.save();

  return res.status(200).json(
    new ApiResponse(200, {
      videoId,
      isLiked: type === "like",
      isDisliked: type === "dislike",
    })
  );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { type } = req.body;

  if (!isValidObjectId(commentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid commentId",
    });
  }

  if (!["like", "dislike"].includes(type)) {
    return res.status(400).json({
      success: false,
      message: "Invalid type",
    });
  }

  const likeAlready = await Like.findOne({
    comment: commentId,
    likedBy: req.user._id,
  });

  if (!likeAlready) {
    await Like.create({
      comment: commentId,
      likedBy: req.user._id,
      type,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, {
          commentId,
          isLiked: type === "like",
          isDisliked: type === "dislike",
        })
      );
  }

  if(likeAlready.type === type){
    await Like.findByIdAndDelete(likeAlready._id);
    return res.status(200)
    .json(
      new ApiResponse(200, { commentId, isLiked : false, isDisliked: false})
    )
  }

  likeAlready.type = type;
  await likeAlready.save();

   return res.status(200).json(
    new ApiResponse(200, {
      commentId,
      isLiked: type === "like",
      isDisliked: type === "dislike",
    })
  );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { type } = req.body;

  if (!isValidObjectId(tweetId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid tweetId",
    });
  }

  if (!["like", "dislike"].includes(type)) {
    return res.status(400).json({
      success: false,
      message: "Invalid type",
    });
  }

  const likedAlready = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user._id,
  });

  if (!likedAlready) {
    await Like.create({
      tweet: tweetId,
      likedBy: req.user._id,
      type,
    });

    return res.status(200).json(
      new ApiResponse(200, {
        tweetId,
        isLiked: type === "like",
        isDisliked: type === "dislike",
      })
    );
  }

  

  if (likedAlready.type === type) {
    await Like.findByIdAndDelete(likedAlready._id);

    return res
      .status(200)
      .json(
        new ApiResponse(200, { tweetId, isLiked: false, isDisliked: false })
      );
  }

  likedAlready.type = type;
  await likedAlready.save();

  return res.status(200).json(
    new ApiResponse(200, {
      tweetId,
      isLiked: type === "like",
      isDisliked: type === "dislike",
    })
  );
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideoAggregate = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideo",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "ownerDetails",
            },
          },
          {
            $unwind: "$ownerDetails",
          },
        ],
      },
    },
    {
      $unwind: "$likedVideo",
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 0,
        likedVideo: {
          _id: 1,
          "videoFile.url": 1,
          "thumbnail.url": 1,
          owner: 1,
          title: 1,
          description: 1,
          views: 1,
          duration: 1,
          createdAt: 1,
          isPublished: 1,
          ownerDetails: {
            username: 1,
            fullName: 1,
            avatar: 1,
          },
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        likedVideoAggregate,
        "Liked video fetched successfully"
      )
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
