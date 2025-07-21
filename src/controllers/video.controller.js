import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {Like} from "../models/like.model.js"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteOnCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    
    //TODO: get all videos based on query, sort, pagination

    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    console.log(userId);
    const pipeline = [];

    // for using Full Text based search u need to create a search index in mongoDB atlas
    // you can include field mapppings in search index eg.title, description, as well
    // Field mappings specify which fields within your documents should be indexed for text search.
    // this helps in seraching only in title, desc providing faster search results
    // here the name of search index is 'search-videos'
    if (query) {
        pipeline.push({
            $search: {
                index: "search-videos",
                text: {
                    query: query,
                    path: ["title", "description"] //search only on title, desc
                }
            }
        });
    }

    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId");
        }

        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        });
    }

    // fetch videos only that are set isPublished as true
    pipeline.push({ $match: { isPublished: true } });

    //sortBy can be views, createdAt, duration
    //sortType can be ascending(-1) or descending(1)
    if (sortBy && sortType) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        });
    } else {
        pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push(
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
                            "avatar.url": 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$ownerDetails"
        }
    )

    const videoAggregate = Video.aggregate(pipeline);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const video = await Video.aggregatePaginate(videoAggregate, options);

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Videos fetched successfully"));

})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary, create video

    if([!title || !description].some((field)=>field?.trim()==="")){
        throw new ApiError(400, "title or description are required")
    }

    const localPathVidoe = req.files?.videoFile[0].path;
    const localPathThumbnail = req.files?.thumbnail[0].path;
    console.log(localPathVidoe);
    
    

    if(!(localPathVidoe || localPathThumbnail)){
        throw new ApiError(400, "video or thumbnai are required")
    }

    const video = await uploadOnCloudinary(localPathVidoe);
    const thumbnail = await uploadOnCloudinary(localPathThumbnail);
    console.log(video);
    

    if(!(video || thumbnail)){
        throw new ApiError(500, "Something went wrong while uploading files")
    }

    await Video.create({
        title,
        description,
        videoFile : {
            video : video?.url,
            public_id: video.public_id
        },
        thumbnail : {
            thumbnail : thumbnail?.url,
            public_id: thumbnail.public_id
        },
        owner: req.user?._id,
        isPublished: true
    })

    // const videoUploaded = await Video.findById(video._id);

    // if (!videoUploaded) {
    //     throw new ApiError(500, "videoUpload failed please try again !!!");
    // }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video uploaded successfully"));


})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "invalid videoId")
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404,"video not found")
    }

    const getVideo = await Video.aggregate([
        {
            $match : {
                owner : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup : {
                from : "likes",
                localField : "_id",
                foreignField : "video",
                as : "like"
            },
            
        },
        {
            $lookup : {
                from : "comments",
                localField : "_id",
                foreignField : "video",
                as : "comment",
                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "user"
                        }
                    }
                ]
            },
            $addFields : {
                $size : {
                    likes : "$like"
                },
                comment : "$comment"
            },
        },
        {
            $project : {
                title : 1,
                description : 1,
                like : 1,
                comment : 1

            }          

        }
    ]);
    

    return res.status(200)
    .json(
        new ApiResponse(200, getVideo, "video fatched successfully" )
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const {title, description} = req.body;
    //TODO: update video details like title, description, thumbnail

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "invalid vidoeId")
    }

    if(!(title || description)){
        throw new ApiError(400, "title or description are required")
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, "video not found")
    }

    if(video.owner.toString() !== req.user._id.toString()){
        throw new ApiError(401, "only authorised user is update video details")
    }

    const thumbnailToDelete = video?.thumbnail.public_id; //delete old thumbnail
    const thumbnailLocalPath = req.file?.path;

    if(!thumbnailLocalPath){
        throw new ApiError(400, "thumbnail is required")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if(!thumbnail){
        throw new ApiError(500, "something went wrong while upload thumbnail")
    }




    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set : {
                title,
                description,
                thumbnail : {
                    public_id : thumbnail.public_id,
                    url : thumbnail.url
                }
            }
        },
        {
            new : true
        }
    )

    if(!updateVideo){
        throw new ApiError(500, "something wents wrong while updated video details")
    }

    if(updateVideo){
        await deleteOnCloudinary(thumbnailToDelete)
    }

    return res.status(200)
    .json(
        new ApiResponse(200, {updatedVideo}, "video updated successfully")
    )

    



})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"invalid videoId")
    }

    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404, "video not found");
    }

    if(video.owner.toString() !== req.user._id.toString()){
        throw new ApiError(401, "only video owner delete video")
    }

    const deletedVideo = await Video.findByIdAndDelete(videoId);

    if(!deleteVideo){
        throw new ApiError(500, "something went wrong while deleting video please try again")
    }

    await deleteOnCloudinary(video.videoFile.public_id)
    await deleteOnCloudinary(video.thumbnail.public_id)

    await Like.deleteMany({
        video : videoId
    })

    await Comment.deleteMany({
        video : videoId
    })

    return res.status(200)
    .json(
        new ApiResponse(200, {}, "vidoe deleted successfully")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "invalid videoId")
    }

    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404, "video not found")
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(
            400,
            "You can't toogle publish status as you are not the owner"
        );
    }

    const toggledVideoPublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video?.isPublished
            }
        },
        { new: true }
    );

    if (!toggledVideoPublish) {
        throw new ApiError(500, "Failed to toogle video publish status");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isPublished: toggledVideoPublish.isPublished },
                "Video publish toggled successfully"
            )
        );
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}