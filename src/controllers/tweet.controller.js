import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { content, owner } = req.body;

  if (!content) {
    throw new ApiError(400, "content is required");
  }

  let tweet = await Tweet.create({
    content,
    owner: req.user._id,
  });
  tweet = await tweet.populate("owner", "username avatar");

  if (!tweet) {
    throw new ApiError(500, "Something went wrong while creating db");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$ownerDetails",
        },
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: {
            $filter: {
              input: "$likes",
              as: "l",
              cond: { $eq: ["$$l.type", "like"] },
            },
          },
        },
        dislikesCount: {
          $size: {
            $filter: {
              input: "$likes",
              as: "l",
              cond: { $eq: ["$$l.type", "dislike"] },
            },
          },
        },
        isLiked: {
          $in: [
            new mongoose.Types.ObjectId(req.user._id),
            {
              $map: {
                input: {
                  $filter: {
                    input: "$likes",
                    as: "l",
                    cond: { $eq: ["$$l.type", "like"] },
                  },
                },
                as: "l",
                in: "$$l.likedBy",
              },
            },
          ],
        },
        isDisLiked: {
          $in: [
            new mongoose.Types.ObjectId(req.user._id),
            {
              $map: {
                input: {
                  $filter: {
                    input: "$likes",
                    as: "l",
                    cond: { $eq: ["$$l.type", "dislike"] },
                  },
                },
                as: "l",
                in: "$$l.likedBy",
              },
            },
          ],
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        content: 1,
        owner: 1,
        createdAt: 1,
        updatedAt: 1,
        likesCount: 1,
        dislikesCount: 1,
        isLiked: 1,
        isDisLiked: 1,
      },
    },
  ]);

  //     if (tweets.length === 0) {
  //   return res.status(200).json(
  //     new ApiResponse(200, [], "No tweets found")
  //   );
  // }

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "Here is Your tweets"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;

  const tweet = await Tweet.findOne({
    owner: req.user._id,
  });

  if (!tweet) {
    return res.status(404).json({
      success: false,
      message: "tweet not found",
    });
  }

  if (tweet.owner.toString() !== req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: "You are not authorized to update this tweet",
    });
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(tweetId, {
    $set: {
      content,
    },
  });

  if (!updateTweet) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updated tweet",
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet Updated Successfully...."));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { tweetId } = req.params;

  const tweet = await Tweet.findOne({
    owner: req.user._id,
  });

  if (!tweet) {
    return res.status(404).json({
      success: false,
      message: "Tweet not found",
    });
  }
  if (tweet.owner.toString() !== req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: "You are not authorized to update this tweet",
    });
  }

  await Tweet.findByIdAndDelete(tweetId);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Tweet deleted successfully"));
});

const getAllTweets = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (!isValidObjectId(userId)) {
    return res.status(404).json({
      success: false,
      message: "Invalid userId",
    });
  }

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: {
          $ne: new mongoose.Types.ObjectId(userId),
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $addFields: { owner: { $first: "$owner" } },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "dislikes",
        localField: "_id",
        foreignField: "tweet",
        as: "dislikes",
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
        dislikesCount: { $size: "$dislikes" },
        isLiked: {
          $in: [
            new mongoose.Types.ObjectId(userId),
            {
              $map: {
                input: {
                  $cond: {
                    if: { $isArray: "$likes" },
                    then: "$likes",
                    else: [],
                  },
                },
                as: "like",
                in: "$$like.user",
              },
            },
          ],
        },
        isDisLiked: {
          $in: [
            new mongoose.Types.ObjectId(userId),
            {
              $map: {
                input: {
                  $cond: {
                    if: { $isArray: "$dislike" },
                    then: "$dislikes",
                    else: [],
                  },
                },
                as: "dislike",
                in: "$$dislike.user",
              },
            },
          ],
        },
      },
    },
    {
      $sort: { createdAt: -1 },
    },

    {
      $project: {
        content: 1,
        createdAt: 1,
        likesCount: 1,
        isLiked: 1,
        dislikesCount: 1,
        isDisLiked: 1,
        "owner.username": 1,
        "owner.avatar": 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "All Tweets fetched successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet, getAllTweets };
