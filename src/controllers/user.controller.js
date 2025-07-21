import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

    //get user details from frontend
    //validation - not empty
    //check if user already register : fullname, email
    //check image, and avatar
    //check avatar because it data model field is required
    //upload images and avatar on cloundinary
    //creat user object- creat entry in db
    //remove pass, remove refresh token field from response
    //check user creation succesfully
    //retur respose 

    const generateAccessTokenAndRefreshToken = async (userId) =>{
        //tokens ko create krne ke liye userId to lgti hi jo humne parmeter me li ab userId User ke andar se milengi
        try {
            const user = await User.findById(userId)
            const accessToken = user.generatAccessToken()
            const refreshToken = user.generatRefreshToken()
            //ab tokens h wo generate to ho gaye h lekin method ke andar hi h server pe save nhi huye h to save krte h

            user.refreshtoken = refreshToken  //is line jo usermodel bna hua oske object jo refreshtoken h osme refreshtoken save ho gya h
            await user.save({validateBeforeSave: false})

            return{accessToken, refreshToken}
            
        } catch (error) {
            throw new ApiError(500, "Something went wrong while generating access and refresh toke")
        }

    }

    const registerUser = asyncHandler( async(req,res)=>{
   

    //step 1 getuser details from frontend

   const {fullname, email, username, password} = req.body //yha pe hum sirf jo json se data aa rha h osse
   //handle kr rhe jaise fullname email etc lekin jo file aa rhi hai osse handle nhi kr rhe jaise avatar,image
    // console.log("email", email);

    //step 2 validation 

    if([fullname, username,email,password].some((field) => field ?.trim()==="")){
        throw new ApiError(400,"All field are required")
    }

    //step 3 check user already exits

    const existedUser = await User.findOne({
        $or : [{ username }, { email }]
    })
    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    //step 4 check avatar and image 

    const avatarLocakPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    //step 5 check avatar file is required

    if(!avatarLocakPath){
        throw new ApiError (400,"avatar file is required")
    }

    //step 6 upload on cloudinary

    const avatar = await uploadOnCloudinary(avatarLocakPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    //yha pe hum ek bar or check kr rhe h ki avatar upload hua h ya nhi q ki ye required h

    if(!avatar){
        throw new ApiError (400,"avatar file is required")
    }

    //step 7 creat user object- creat entry in db

    const user = await User.create({
        fullname,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })

    //yha hum check kr rhe h ki user object creat hua h ya nhi oski id se check kr rhe h
    //or step 8 remove pass, remove refresh token field from response ko follow kr rhe h

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // ab jo id se user mila h wo createUser me store ho gya honga to check kr lenge ki user creat hua h ya nhi

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while register the form")
    }

    // step 9 retur respose to user

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfuly")
    )

    
    
    
    
    })

//start login process 

    //req.body => data
    //username or email
    //find the user
    //check password
    //access and refresh token
    //send tokes in cookie
    //return response

    //step 1
   
    const loginUser = asyncHandler (async(req, res)=>{
        const { username, email, password } = req.body;

    //step 2

    if(!(email || username)){
        throw new ApiError(400, "username or email is required")
    }

    //step 3 find the user

    const user = await User.findOne({
        $or : [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User does not exist")
    }

    //step 4 password check

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "password incorrect")
    }

    //step 5 access and refresh token

    const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    
    

    if(!loggedInUser){
        throw new ApiError(404, "User not exist")
    }

    //step 6 cookie

    const options = {
        httpOnly : true,
        secure : true
    }

    //step 7 return res

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            201,
            {
                user : loggedInUser, accessToken, refreshToken
            },
            "User logged in Successfully"
        )
    )
    })

    const logoutUser = asyncHandler (async (req,res)=>{
        const user = await User.findByIdAndUpdate(
            req.user._id,
        {
            $unset : {
                refreshToken : 1
            }
        },
        {
            new : true
        }
    )
    
    const options = {
        httpOnly : true,
        secure : true
    }
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200,{},"User Log Out"))
    
})


    const refreshAccessToken = asyncHandler(async(req,res)=>{
        
        
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
        console.log(incomingRefreshToken);
        
        
        
       
        

        if(!incomingRefreshToken){
            throw new ApiError(401, "unauthorised request")
        }

        try {
            const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
            
            
            
            
            
            if(!decodedToken){
                throw new ApiError(401, "unauthorised request")
            }
            
            const user = await User.findById(decodedToken?._id)
            
            // console.log(user);
            
            
            
    
            if(!user){
                throw new ApiError(401, "Invalid refresh token")
            }
            
            
            
            if(incomingRefreshToken !== user?.refreshToken){
                throw new ApiError(401, "Refresh token is expired or used")
            }
    
            const {accessToken, newRefreshToken} = await generateAccessTokenAndRefreshToken(user._id);
            
            const options = {
                httpOnly : true,
                secure : true
            }
    
            return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                200,
                {
                    accessToken, refreshToken : newRefreshToken
                },
                "refreshToken refreshed"
            )
        } catch (error) {
            throw new ApiError(400, error?.message || "invalid refresh token")
        }


    })

    const changePasswordCurrent = asyncHandler(async(req, res)=>{
        const {oldPassword, newPassword} = req.body;

        const user = await User.findById(req.user?._id)

        const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

        if(!isPasswordCorrect){
            throw new ApiError(400, "Invalid password")
        }

        user.password = newPassword;
        
        await user.save({validateBeforeSave : false})

        return res.status(200)
        .json(
            new ApiResponse(201, {},
                "Password change successfully"
            )
        )
    })

    const getCurrectUser = asyncHandler(async(req,res)=>{

        return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "current user fetched successfully")
        )
    })

    const updateAccountDetails = asyncHandler(async(req, res)=>{
        const {fullname, email} = req.body;

        if(!(fullname || email)){
            throw new ApiError(400, "All fields are required")
        }

        const user = User.findByIdAndUpdate(
            req.user._id,
            {
                $set : {
                    fullname : fullname,
                    email : email
                }
            },
            {new : true}
        ).select("-password")
        
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "Account details changed successfully"
            )
        )

    })

    const updateUserAvatar = asyncHandler(async(req, res)=>{

        const avatarLocalPath = req.file.path;
        if(!avatarLocalPath){
            throw new ApiError(400, "avatar file is missing")
        }

        const avatar = await uploadOnCloudinary(avatarLocalPath);
        
        if(!avatar.url){
            throw new ApiError(400, "Error while uploading avatar on cloudinary")
        }

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set : {
                    avatar : avatar.url
                }
            },
            {new : true}
        ).select("-password")

        return res
        .status(200)
        .json(
            new ApiResponse(200, user, "avatar updated successfully")
        )
    })

    const updateUserCoverImage = asyncHandler(async(req, res)=>{
        const coverImageLocalPath = req.file.path;

        if(!coverImageLocalPath){
            throw new ApiError(400, "cover image file is missing")
        }

        const coverImage = await uploadOnCloudinary(coverImageLocalPath);
        if(!coverImage.url){
            throw new ApiError(400, "Error while uploading coverImage")
        }

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set : {
                    coverImage : coverImage.url
                }
            },
            {new : true}
        ).select("-password")

        return res
        .status(200)
        .json(
            new ApiResponse(200, user, "cover Image updated successfully")
        )
    })

    const getUserChannelProfile = asyncHandler(async(req, res)=>{
        //sb se pahle to hum url se username lenge kaise dekhte hai
        const {username} = req.params;

        if(!username?.trim()){
            throw new ApiError(400, "username is required")
        }

        //agar username mil gya hai to osko match krwa rhe h pipeline ki help se ye easy padta h
       
        
        const channel = await User.aggregate([
            {
                $match : {
                    username : username.toLowerCase()
                                      
                    
                }
            },
            {
                $lookup : {
                    from : "subcriptions",
                    localField : "_id",
                    foreignField : "channel",
                    as : "subcribers"
                }
            },
            {
                $lookup : {
                    from : "subcriptions",
                    localField : "_id",
                    foreignField : "subcriber",
                    as : "subcribedTo"
                }
            },
            //ab hum count krenge or jo user model h osme ye do new field add ho rhi addfields se
            {
                $addFields : {
                    subcribersCount : {
                        $size : "$subcribers"
                    },
                    channelSubcribedToCount : {
                        $size : "$subcribedTo"
                    },
                    isSubcribed : {
                        $cond : {
                            if : {$in : [req.user?._id, "$subcribers.subcriber"]},
                            then: true,
                            else : false 
                        }
                    },

                }
            },
            {
                $project : {
                    fullname : 1,
                    username : 1,
                    subcribersCount : 1,
                    channelSubcribedToCount : 1,
                    isSubcribed : 1,
                    email : 1,
                    avatar : 1,
                    coverImage : 1


                }
            }
        ])
        

        if(!channel?.length){
            throw new ApiError("channel does not exists")
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200, channel[0],"User fetched successfully")
        )
    })

    const getWatchHistory = asyncHandler(async(req, res)=>{
        const user = await User.aggregate([
            {
                $match : {
                    _id : new mongoose.Types.ObjectId(req.user._id)
                }
            },
            {
                $lookup : {
                    from : "videos",
                    localField : "watchHistory",
                    foreignField : "_id",
                    as : "watchHistory",
                    pipeline : [
                        {
                            $lookup : {
                                from : "users",
                                localField : "owner",
                                foreignField : "_id",
                                as : "owner",
                                pipeline : [
                                    {
                                        $project : {
                                            fullname : 1,
                                            username : 1,
                                            avatar : 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields : {
                                owner : {
                                    $first : "$owner"
                                }
                            }
                        }
                    ]
                }
            }
        ])

        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched successfully"
            )
        )
    })









export {registerUser,
        loginUser,
        logoutUser,
        refreshAccessToken,
        changePasswordCurrent,
        getCurrectUser,
        updateAccountDetails,
        updateUserAvatar,
        updateUserCoverImage,
        getUserChannelProfile,
        getWatchHistory
    }