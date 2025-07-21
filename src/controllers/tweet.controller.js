import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {owner, content}= req.body;

    if(!content){
        throw new ApiError(400, "content is required")
    }

    const tweet = await Tweet.create({
        content,
        owner
    })

    if(!tweet){
        throw new ApiError(500, "Something went wrong while creating db")
    }

    return res.status(200)
    .json(
        new ApiResponse(200,tweet,"Tweet created successfully")
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params;

    const tweets = await Tweet.aggregate([
        {
            $match : {
                owner : new mongoose.Types.ObjectId(userId),
            }

        },
        {
            $lookup : {
                from : "User",
                localField : "owner",
                foreignField : "_id",
                as : "ownerDetails",
                pipeline : [
                    {
                        $project : {
                            username : 1,
                            "avatar.url" : 1
                        }
                    }
                ]
            }
        },
        {
            $addFields : {
                ownerDetails : {
                    $first : "$ownerDetails"
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
                ownerDetails : 1
            }
        }
    ]);

    if(!tweets){
        throw new ApiError(409, "Tweets not found")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, tweets, "Here is Your tweets")
    )

    
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {userId} = req.params;
    const {content} = req.body;

    const tweet = await Tweet.findById(userId);

    if(!tweet){
        throw new ApiError(409, "tweet not found")
    }

    if(tweet.owner.toString() !== req.user._id.toString()){
        throw new ApiError(409, "You are not authorized to update this tweet")
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweet?._id,
        {
            $set : {
                content
            }
        }
    )

    if(!updateTweet){
        throw new ApiError(500, "Something went wrong while updated tweet")
    }
    
    

    return res.status(200)
    .json(
        new ApiResponse(200,updatedTweet, "Tweet Updated Successfully")
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {userId} = req.params;

    const tweet = await Tweet.findById(userId);

    if(!tweet){
        throw new ApiError(409, "Tweet not found")
    }
    if(tweet.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403,"You are not authorized to update this tweet")
    }

    await Tweet.findByIdAndDelete(userId)




    
     return res.status(200).json(
        new ApiResponse(200, null, "Tweet deleted successfully")
    );



})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}